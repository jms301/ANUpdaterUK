import {validateANPayloads, validateANPerson} from './validate-an.js'

const pcodeValid = new RegExp(/^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/)
const pcodeFilter = new RegExp(/[^a-zA-Z0-9]/g)
const userIdFilter = new RegExp(/[^-a-zA-Z0-9]/g)


async function gatherResponse(response) {
  const { headers } = response;
  const contentType = headers.get("content-type") || "";
  if (contentType.includes("application/json") ||
    contentType.includes("application/hal+json")) {
    return await response.json();
  } else if (contentType.includes("application/text")) {
    return response.text();
  } else if (contentType.includes("text/html")) {
    return response.text();
  } else {
    return response.text();
  }
}

async function lookupPostcodes(msgArr, env) {

  const pc_lkup = await env.DB.prepare('SELECT postcode, name_an, name_an_cy, pcode_wpc_wpclist.short_code, region, con_type, electorate FROM pcode_wpc_wpclist LEFT OUTER JOIN wpc_names ON pcode_wpc_wpclist.short_code = wpc_names.short_code WHERE postcode = ?1');


  const rows = await env.DB.batch( msgArr.map((msg) => {
    return pc_lkup.bind(
      msg.person.postal_addresses[0].postal_code.replaceAll(pcodeFilter, "").toUpperCase());
  }));

  return rows;
}

async function updatePersonRecord(url, body, env) {
  const init = {
    headers: {
      "content-type": "application/json;charset=UTF-8",
      "OSDI-API-Token": env.AN_API_KEY
    },
    body: JSON.stringify(body),
    method: "PUT"
  };
  return fetch(url, init)
}

export default {
  async fetch (req, env, ctx) {

    const contentType = req.headers.get("content-type") || "";
    if(req.method != "POST" ||
      !contentType.includes("application/json")) {
      return new Response(null, {status: 400});
    }

    const validateWH = validateANPayloads;

    //webhook payloads
    const payloads = await req.json();
    //This will check the payload is valid and strip unvalidated params
    if(!validateWH(payloads)) {
      return new Response(null, {status: 400});
    }

    const toQueueUp = [];

    for(let payload of payloads) {
      payload = payload?.["osdi:signature"] ||
          payload?.["osdi:attendance"] ||
          payload?.["osdi:submission"] ||
          payload?.["action_network:action"] ||
          payload?.["action_network:upload"] ||
          payload?.["osdi:donation"] ||
          payload?.["osdi:outreach"];

      // normalize postcode
      const postcode = payload.person?.postal_addresses?.[0]?.postal_code?.replaceAll(pcodeFilter, "").toUpperCase();

      // The payload includes all the data that was submitted to the
      // AN form so if there is no useful postcode in it we can skip this person.
      if(postcode == null || !postcode.match(pcodeValid)) {
        //we can't do anything with this update
        continue;
      }

      const anPersonUrl =  "https://actionnetwork.org/api/v2/people/";
      if(!payload._links["osdi:person"].href.startsWith(anPersonUrl)) {
        // The given link doesn't start with AN API so this maybe is someone trying to do something nefarious.
        return new Response(null, {status: 400});
      }

      // Pull the user ID from the link, strip the leading AN string and then replace non-ID characters.
      const userId = payload._links["osdi:person"].href.substring(
        anPersonUrl.length ).replaceAll(userIdFilter, "");

      //add this userID to the queue.
      toQueueUp.push({"body": {
        "usr_id": userId
// don't trust the payload because webhook is insecure.
//        "pcode": postcode,
//        "old_constituency": old_constituency
      }});
    }

   //add to the queue without blocking.
   ctx.waitUntil(await env.users_queue.sendBatch(toQueueUp))

   return new Response(null, {status: 200});

  },
  async queue(batch, env, ctx) {
    const validatePerson = validateANPerson;
    const baseAnUrl =  "https://actionnetwork.org/api/v2/people/";
    const init = {
      headers: {
        "content-type": "application/json;charset=UTF-8",
        "OSDI-API-Token": env.AN_API_KEY
      },
    };

    // Getting all users AN records (don't trust the webhook payloads!)
    const anPeoplePms = batch.messages.map(async (msg) => {
      const response = await fetch(baseAnUrl+msg.body.usr_id.replaceAll(userIdFilter, ""), init);
      const person = await gatherResponse(response);

      // Is this a record that needs processing?
      if(typeof person === "string" ||
        !validatePerson(person)) {
        // typeof string === not a JSON object returned
        // validate the return  - also strips unvalidated fields
        msg.retry();
        return null;

      } else if (person?.custom_fields?.["Lock_Updates"]?.length > 2 ) {
        // check if updates are locked undefined > 2 is false
        msg.ack();
        return null;

      } else {
        // this record needs updating
        return { msg: msg, person: person};
      }
    });

    // This should allow the requests to AN to happen in parralel (so you do need a limit on the batch sizes!)
    const messages = await Promise.all(anPeoplePms).then( (values) => {
      return values.filter((x) => { return x !== null});
    });

    if(messages.length == 0) {
      // we've filtered everything out already
      return;
    }

    const pcodeData = await lookupPostcodes(messages, env);

    for(let i = 0; i < messages.length; i++ ) {
      const msg = messages[i].msg;
      const person = messages[i].person;
      const data = pcodeData[i];

      //db lookup failed
      if( !data.success) {
        msg.retry();
        continue;
      }

      //db lookup no results
      if(data.results.length == 0) {
        msg.ack();
        continue;  // no more to do here
      }

      //already been set
      if( person?.custom_fields?.["Parliamentary_Constituency_2024"] ==
        data.results[0].name_an ) {
        msg.ack();
        continue;
      }

      const body = {
        "custom_fields": {
          "Parliamentary_Constituency_2024" : data.results[0].name_an,
          "P_Constituency_Cy" : data.results[0].name_an_cy,
          "P_Constituency_Region" : data.results[0].region,
          "Constituency Source" : "AN Auto Updater v2"
        }
      }
      const url = person["_links"]["self"]["href"] +
        "/?background_request=true";
      ctx.waitUntil(updatePersonRecord(url, body, env));
    }
	}
};
