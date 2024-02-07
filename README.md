# AN Updater UK
Action Network Updater is a microservice which runs on cloudflare workers and adds UK Parliamentary Constituency data to Action Network Activist records. 

## How does it work? 

- Recieve Action Network Webhook payload to discover activists who's records have changed.
- Check (via naive regex) to see if there is a valid postcode in this update.
- Queue up all userIds that might need an update

**Processing the queue**
- Connect to AN API to get each users record
- Lookup all the postcodes for these users in the D1 Database
- If the users "Parliamentary\_Constituency\_2024" field doesn't match the lookup then update: 
  - Parliamentary\_Constituency\_2024  - The constituency name (removing non ascii characters because AN can't cope)
  - P\_Constituency\_Certain - True/False If the users postcode could match other constituencies.
  - P\_Constituency\_Cy - The welsh constituency name (removing non-ascii characters because...)
  - P\_Constituency\_Region - The English region or else the country name (Scotland, Wales, Northern Ireland)


## Requirements:

- Cloudflare Workers (free tier is probably good enough!)
- A Postcode Lookup database (I've included the one I've generated but give no guarantee that it's correct!)
- An Action Network partner account (For the API and Webhook features)


## Dev Setup: 

Create a cloudflare account

```console
:~$ git clone https://github.com/jms301/ANUpdaterUK.git an-updater
:~$ cd an-updater
:~$ npm install
```

### On Cloudflare Workers you need:

- A D1 Database: 'pcode\_wpc' bound to "DB"
- A secret 'AN\_API\_KEY' storing your AN API key. 

```console
:~$ cp dev.env .dev.env 
:~$ cp wrangler.toml.template wrangler.toml
:~$ npx wrangler login 
:~$ npx wrangler d1 create pcode_wpc

[[d1_databases]]
binding = "DB" # i.e. available in your Worker on env.DB
database_name = "pcode_wpc"
database_id = "< ID UUID >"

```

Update the above 3 lines in wrangler.toml

Load in a short test db (local db can't handle the full one)

```console
:~$ npx wrangler d1 execute pcode_wpc --file="./data/pcodes_wpc.short.sql" --local
```
edit .dev.env to add in your AN API key


> [!CAUTION]
> The dev server **WILL** connect to and modify data in the Action Network account you give it an API key for! 

```console
:~$ npx wrangler dev
```
> [!CAUTION]
> The dev server **WILL** connect to and modify data in the Action Network account you give it an API key for! 

nb. The postcode constituency data is licensed by ONS and Ordinance Survey see the LICENSE file for details. 

