const fs = require("fs")
const path = require("path")
const Ajv = require("ajv")
const standaloneCode = require("ajv/dist/standalone").default

  
const payloadSchema = {
  $id: "#/definitions/validate-an-payloads",
  $schema: "http://json-schema.org/draft-07/schema",
  type: "array",
  items: {
    "oneOf": [
      { 
        type: "object", 
        properties: { 
          "osdi:signature" : {"$ref": "#/$defs/an_items"},
          "idempotency_key" : { 
            type: "string"
          }
        },
        required:  ["osdi:signature", "idempotency_key"]
      },{ 
        type: "object", 
        properties: { 
          "osdi:attendance" : {"$ref": "#/$defs/an_items"},
          "idempotency_key" : { 
            type: "string"
          }
        },
        required: ["osdi:attendance", "idempotency_key"]
      },{ 
        type: "object", 
        properties: { 
          "osdi:submission" : {"$ref": "#/$defs/an_items"},
          "idempotency_key" : { 
            type: "string"
          }
        },
        required: ["osdi:submission", "idempotency_key"]
      },{ 
        type: "object", 
        properties: { 
          "action_network:action" : {"$ref": "#/$defs/an_items"},
          "idempotency_key" : { 
            type: "string"
          }
        },
        required: ["action_network:action", "idempotency_key"]
      },{ 
        type: "object", 
        properties: { 
          "action_network:upload" : {"$ref": "#/$defs/an_items"},
          "idempotency_key" : { 
            type: "string"
          }
        },
        required: ["action_network:upload", "idempotency_key"]
      },{ 
        type: "object", 
        properties: { 
          "osdi:donation" : {"$ref": "#/$defs/an_items"},
          "idempotency_key" : { 
            type: "string"
          }
        },
        required: ["osdi:donation", "idempotency_key"]
      },{ 
        type: "object", 
        properties: { 
          "osdi:outreach" : {"$ref": "#/$defs/an_items"},
          "idempotency_key" : { 
            type: "string"
          }
        },
        required: ["osdi:outreach", "idempotency_key"]
      }
    ]
  },
  "$defs": { 
    "an_items" : { 
      type: "object", 
      properties: {
        "_links": { 
          type: "object", 
          properties: { 
            "osdi:person": { 
              type: "object", 
              properties: { 
                "href": { 
                  type: "string", 
                }
              },
              required: ["href"]
            }
          },
          required: ["osdi:person"]
        },
        "person" : { 
          type: "object",
          properties: { 
            "postal_addresses": {
              type: "array",
              items: [{
                type: "object", 
                properties: { 
                  "postal_code": { type: "string" } 
                }
              }],
              minItems: 0,
              additionalItems: true
            }, 
            "custom_fields": { 
              type: "object",
              properties: { 
                "Parliamentary_Constituency_2024": { 
                  type: "string"
                }
              }
            }
          }
        }
      },
      required: ["_links", "person"]
    }
  }
}

const personSchema = {
  $id: "#/definitions/validate-an-person",
  $schema: "http://json-schema.org/draft-07/schema",
  type: "object",
  properties: { 
    "_links": { 
      type: "object", 
      properties: { 
        "self": { 
          type: "object", 
          properties: { 
            "href": { type: "string" }
          }, 
          required: ["href"]
        }
      },
      required: ["self"]
    },
    "postal_addresses": {
      type: "array",
      items: [{
        type: "object", 
        properties: { 
          "postal_code": { type: "string" } 
        },
        required: ["postal_code"]
      }],
      minItems: 1,
      additionalItems: true
    }, 
    "custom_fields": { 
      type: "object",
      properties: { 
        "Parliamentary_Constituency_2024": { 
          type: "string"
        },
        "Lock_Updates" : {
          type: "string"
        },
      }
    }
  },
  required: ["_links", "postal_addresses"] 
}


const ajv = new Ajv({
  schemas: [payloadSchema, personSchema], 
  code: {source: true, esm: true},
  strictTuples: false,
  removeAdditional: "all"
});

let moduleCode = standaloneCode(ajv, {
  "validateANPayloads": "#/definitions/validate-an-payloads",
  "validateANPerson": "#/definitions/validate-an-person"
});

fs.writeFileSync(path.join(__dirname, "../src/validate-an.js"), moduleCode)
