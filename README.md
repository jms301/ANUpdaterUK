# AN Updater UK
Action Network Updater is a microservice which runs on cloudflare workers and adds UK Parliamentary Constituency data to Action Network Activist records. 

This is done via a postcode lookup database stored on cloudflare d1. 

## Requirements:

Cloudflare Workers (free tier is probably good enough!)
A Postcode Lookup database (I've included the one I've generated but give no guarantee that it's correct!)
An Action Network partner account (For the API and Webhook features)


## Dev Setup: 

Create a cloudflare account

```console
:~$ git clone https://github.com/jms301/ANUpdaterUK.git an-updater
:~$ cd an-updater
:~$ npm install
```

### On Cloudflare Workers you need:

* A D1 Database: 'pcode\_wpc' bound to "DB"
* A queue: 'an-updated-users' 
* A secret 'AN\_API\_KEY' storing your AN API key. 

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

> [!CAUTION]
> The dev server **WILL** connect to and modify data in the Action Network account you give it an API key for! 


edit .dev.env to add in your AN API key


```console
:~$ npx wrangler dev
```

