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
            var username = players[socket.id].username;
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

            io.in(room).emit('send_message_response', success_data);
            log('Message sent to room ' + room + ' by ' + username);
        });





          /* invite command */
    /*payload;
        {
            requested user : socket id of the person to be invited
        }
        invite response        {
            result : success
            socket_id : the socket id of the person being invited
        or
        {
            reuslt : fail
            message : failure message
        }

         invited response        {
            result : success
            socket_id : the socket id of the person being invited
        or
        {
            reuslt : fail
            message : failure message
        }
        */
        socket.on('invite', function(payload){
            log('invite with '+JSON.stringify(payload));

            /*check if payload was sent */
            if(('undefined' === typeof payload) || !payload){
                var error_message = 'invite had no payload, command aborted';
                log(error_message);
                socket.emit('invite_response', {
                    result: 'fail', 
                    message: error_message
                });
                return;
            }

            var username = players[socket.id].username;
            if(('undefined' === typeof username) || !username){
                var error_message = 'invite cant identify who sent the message';
                log(error_message);
                socket.emit('invite_response', {
                    result: 'fail', 
                    message: error_message
                });
                return;
            }
            var requested_user = payload.requested_user;
            if(('undefined' === typeof requested_user) || !requested_user){
                var error_message = 'invite didnt identify a requested_user, command aborted';
                log(error_message);
                socket.emit('invite_response', {
                    result: 'fail', 
                    message: error_message
                });
                return;
            }


            var room = players[socket.id].room;
            var roomObject = io.sockets.adapter.rooms[room];
            /*make sure the user being invited is in the room */
            if(!roomObject.sockets.hasOwnProperty(requested_user)){
                var error_message = 'invite requested a user that wasnt in the room, command aborted';
                log(error_message);
                socket.emit('invite_response', {
                    result: 'fail',
                    message: error_message
                });
                return;
                }


                /* if everything is okay respond to the inviter that it was successful */

            var success_data = {
                result: 'success',
                socket_id: requested_user
            };
            socket.emit('invite_response', success_data);

            /*tell invitee that they ahve been invited. */
            var success_data = {
                result: 'success',
                socket_id: socket.id
            };
            socket.to(requested_user).emit('invited', success_data);
            log('invite successful');
        });




 /* uninvite command */
    /*payload;
        {
            requested user : socket id of the person to be uninvited
        }
        uninvite response        {
            result : success
            socket_id : the socket id of the person being uninvited
        or
        {
            reuslt : fail
            message : failure message
        }

         uninvited response        {
            result : success
            socket_id : the socket id of the person doing the uninviting
        or
        {
            reuslt : fail
            message : failure message
        }
        */
        socket.on('uninvite', function(payload){
            log('uninvite with '+JSON.stringify(payload));

            /*check if payload was sent */
            if(('undefined' === typeof payload) || !payload){
                var error_message = 'uninvite had no payload, command aborted';
                log(error_message);
                socket.emit('uninvite_response', {
                    result: 'fail', 
                    message: error_message
                });
                return;
            }

            var username = players[socket.id].username;
            if(('undefined' === typeof username) || !username){
                var error_message = 'uninvite cant identify who sent the message';
                log(error_message);
                socket.emit('uninvite_response', {
                    result: 'fail', 
                    message: error_message
                });
                return;
            }
            var requested_user = payload.requested_user;
            if(('undefined' === typeof requested_user) || !requested_user){
                var error_message = 'uninvite didnt identify a requested_user, command aborted';
                log(error_message);
                socket.emit('uninvite_response', {
                    result: 'fail', 
                    message: error_message
                });
                return;
            }


            var room = players[socket.id].room;
            var roomObject = io.sockets.adapter.rooms[room];
            /*make sure the user being invited is in the room */
            if(!roomObject.sockets.hasOwnProperty(requested_user)){
                var error_message = 'invite requested a user that wasnt in the room, command aborted';
                log(error_message);
                socket.emit('invite_response', {
                    result: 'fail',
                    message: error_message
                });
                return;
                }


                /* if everything is okay respond to the uninviter that it was successful */

            var success_data = {
                result: 'success',
                socket_id: requested_user
            };
            socket.emit('uninvite_response', success_data);

            /*tell uninvitee that they ahve been uninvited. */
            var success_data = {
                result: 'success',
                socket_id: socket.id
            };
            socket.to(requested_user).emit('uninvited', success_data);
            log('uninvite successful');
        });




 /* game_start command */
    /*payload;
        {
            requested user : socket id of the person to play with
        }
        game_start response        {
            result : success
            socket_id : the socket id of the person you are playing with
            'game_id ': id of the game session
        or
        {
            reuslt : fail
            message : failure message
        }
        */
        socket.on('game_start', function(payload){
            log('game_start with '+JSON.stringify(payload));

            /*check if payload was sent */
            if(('undefined' === typeof payload) || !payload){
                var error_message = 'game_start had no payload, command aborted';
                log(error_message);
                socket.emit('game_start_response', {
                    result: 'fail', 
                    message: error_message
                });
                return;
            }

            var username = players[socket.id].username;
            if(('undefined' === typeof username) || !username){
                var error_message = 'game_start cant identify who sent the message';
                log(error_message);
                socket.emit('game_start_response', {
                    result: 'fail', 
                    message: error_message
                });
                return;
            }
            var requested_user = payload.requested_user;
            if(('undefined' === typeof requested_user) || !requested_user){
                var error_message = 'game_start didnt identify a requested_user, command aborted';
                log(error_message);
                socket.emit('game_start_response', {
                    result: 'fail', 
                    message: error_message
                });
                return;
            }


            var room = players[socket.id].room;
            var roomObject = io.sockets.adapter.rooms[room];
            /*make sure the user being invited is in the room */
            if(!roomObject.sockets.hasOwnProperty(requested_user)){
                var error_message = 'game_start requested a user that wasnt in the room, command aborted';
                log(error_message);
                socket.emit('game_start_response', {
                    result: 'fail',
                    message: error_message
                });
                return;
                }


                /* if everything is okay respond to the game starter that it was successful */
            var game_id = Math.floor((1+Math.random()) * 0x10000).toString(16).substring(1);
            var success_data = {
                result: 'success',
                socket_id: requested_user,
                game_id: game_id
            };
            socket.emit('game_start_response', success_data);

            /*tell the other player to play. */
            var success_data = {
                result: 'success',
                socket_id: socket.id,
                game_id: game_id
            };
            socket.to(requested_user).emit('game_start_response', success_data);
            log('game_start successful');
        });



    });