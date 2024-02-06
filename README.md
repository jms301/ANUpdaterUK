# AN Updater UK
Action Network Updater is a microservice which runs on cloudflare workers and adds UK Parliamentary Constituency data to Action Network Activist records. 

This is done via a postcode lookup database stored on cloudflare d1. 

## Requirements:

Cloudflare Workers (free tier is probably good enough!)
A Postcode Lookup database (I've included the one I've generated but give no guarantee that it's correct!)
An Action Network partner account (For the API and Webhook features)


## Setup: 

On Cloudflare Workers:

* A KV Store
* A D1 Database
* A Queue

See wrangler.template.toml for details
