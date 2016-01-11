# Sinfonier Drawer

FrontEnd part of Sinfonier Project. Allow users to define Apache Storm Topologies (DAG - Directed acyclic graph) in a visual way and send it to Storm Cluster using [Sifonier API](https://github.com/sinfonier-project/sinfonier-api)

This project is a fork from webhookit [webhookit](http://neyric.github.com/webhookit)

## Requisites

 * [Node.js](http://nodejs.org/) (>= 0.6.6)
 * [npm](http://npmjs.org/)
 * [mongoDB](http://www.mongodb.org/) (>= 2)

## Install

    git clone https://github.com/sinfonier-project/sinfonier-drawer.git
    cd sinfonier-drawer
    npm install .

## Start

* Ensure you have a MongoDB running on Localhost
* Start Node Server
 
```sh
cd /path/to/sinfonier-drawer
node app.js    
```

* Browse this URL [http://localhost:8124](http://localhost:8124)
* Create Indexes on MongoDB & supersinfonier user

```sh
    mongo --shell sinfonier db/scripts/indexes.mongo
    mongo --shell sinfonier db/deploy/seeds.mongo
```

Now you can login using 'supersinfonier' user with 'sinfonier' as password

## Integrated

Sinfonier Drawer use

* Gravatar
* Twitter
    - Configure it using **config/twitter.json** file.
* Latch
    - Sinfonier Drawer can be integrated with [Latch](https://latch.elevenpaths.com/). Before configure it it's necessary to create a new application and put Name, ID and Secret parameters in **config/latch.json** file.

## Project leads

* Francisco J. Gomez @ffranz https://github.com/ffr4nz/

## Committers

* Jose Miguel Díez de la Lastra <jmdiez@aspgems.com>

## Contributors

## License

Apache License, Version 2.0: http://www.apache.org/licenses/LICENSE-2.0

