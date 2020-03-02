/* Include the static file webserver library*/
var static = require('node-static');

/*Include the http server library */
var http = require('http');

/* Assume that we are running on heroku */
var port = process.env.PORT;
var directory = __dirname + '/public';

/* if not on heroku, readjust port end directory information */
if(typeof port == 'undefined' || !port){
    directory = './public';
    port = 8080;
}

/* ser up a static webserver that will deliver files from the filesystem */
var file = new static.Server(directory);

/* construct an http server that get files from the file server*/
var app = http.createServer(
    function(request, response){
        request.addListener('end', function(){
            file.serve(request, response);
        }
        ).resume();
        }
    ).listen(port);

    console.log('The server is running');