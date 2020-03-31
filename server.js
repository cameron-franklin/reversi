/********************************************/
/*  set up the static file Server           */

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

/********************************************/
/*  set up the web socket Server           */


/*a registy of socket ids and player info */

var players = [];

var io = require('socket.io').listen(app);

    console.log('A website connected to the server');


io.sockets.on('connection', function (socket){

    log('Client connection by ' +socket.id);
    function log(){
        var array = ['*** Server Log Message: '];
        for(var i = 0; i < arguments.length; i++){
            array.push(arguments[i]);
            console.log(arguments[i]);
        }
        socket.emit('log',array);
        socket.broadcast.emit('log',array);
    }


  


    /* join room command */
    /*payload;
        {
            room : room to join
            username : username of person joining
        }
        join room response
        {
            result : success
            room : room joined
            username : user that joined
            socket_id : the socket id of the person that joined
            membership : people in the room
        }
        or
        {
            reuslt : fail
            message : failure message
        }
        */
        socket.on('join_room', function(payload){
            log('\'join_room\' command' +JSON.stringify(payload));

            /*check that the client sent a payload*/
            if(('undefined' === typeof payload) || !payload){
                var error_message = 'join room had no payload, command aborted';
                log(error_message);
                socket.emit('join_room_response', {
                    result: 'fail', 
                    message: error_message
                });
                return;
            }
 
            /*check that the cloent sent a payload*/

            var room = payload.room;
            if(('undefined' === typeof room) || !room){
                var error_message = 'join room did not specify a room, command aborted';
                log(error_message);
                socket.emit('join_room_response', {
                    result: 'fail', 
                    message: error_message
                });
                return;
            }

            /* check tghat a username has been provided */
            var username = payload.username;
            if(('undefined' === typeof username) || !username){
                var error_message = 'join room had no username, command aborted';
                log(error_message);
                socket.emit('join_room_response', {
                    result: 'fail', 
                    message: error_message
                });
                return;
            }
            /*store info about new player */
            players[socket.id] = {};
            players[socket.id].username = username;
            players[socket.id].room = room;

            /*actually have the user join the room*/

            socket.join(room);

            /* get the room object */

            var roomObject = io.sockets.adapter.rooms[room];
            
            /* tell everyone in the room someone joined*/
            var numClients =roomObject.length;
            var success_data = {
                result: 'success',
                room: room,
                username: username,
                socket_id: socket.id,
                membership: numClients
            };

            io.in(room).emit('join_room_response',success_data);

            for(var socket_in_room in roomObject.sockets){
                var success_data = {
                    result: 'success',
                    room: room,
                    username: players[socket_in_room].username,
                    socket_id: socket_in_room,
                    membership: numClients
                };
                socket.emit('join_room_response', success_data);

            }
            log('join_room success');

        });

        socket.on('disconnect', function(){
            log('client disconnected ' +JSON.stringify(players[socket.id]));

            if('undefined' !== typeof players[socket.id] && players[socket.id]){
                var username = players[socket.id].username;
                var room = players[socket.id].room;
                var payload = {
                    username: username, 
                    socket_id: socket.id
                };
                delete players[socket.id];
                io.in(room).emit('player_disconnected', payload);
            }
        });

        /* send message command */
    /*payload;
        {
            room : room to join
            username : username of person sending message
            message : message to send
        }
        send message response
        {
            result : success
            room : room joined
            username : user that spoke
            message : the message spoken
        }
        or
        {
            reuslt : fail
            message : failure message
        }
        */
        socket.on('send_message', function(payload){
            log('server received a command','send_message', payload);
            if(('undefined' === typeof payload) || !payload){
                var error_message = 'send_message had no payload, command aborted';
                log(error_message);
                socket.emit('send_message_response', {
                    result: 'fail', 
                    message: error_message
                });
                return;
            }

            var room = payload.room;
            if(('undefined' === typeof room) || !room){
                var error_message = 'send_message did not specify a room, command aborted';
                log(error_message);
                socket.emit('send_message_response', {
                    result: 'fail', 
                    message: error_message
                });
                return;
            }
            var username = payload.username;
            if(('undefined' === typeof username) || !username){
                var error_message = 'send_message had no username, command aborted';
                log(error_message);
                socket.emit('send_message_response', {
                    result: 'fail', 
                    message: error_message
                });
                return;
            }
            var message = payload.message;
            if(('undefined' === typeof message) || !message){
                var error_message = 'send_message didnt specify a messsage, command aborted';
                log(error_message);
                socket.emit('send_message_response', {
                    result: 'fail', 
                    message: error_message
                });
                return;
            }

            var success_data = {
                result: 'success',
                room: room,
                username: username,
                message: message,
            }

            io.sockets.in(room).emit('send_message_response', success_data);
            log('Message sent to room ' + room + ' by ' + username);
        });
    });