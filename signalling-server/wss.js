const WebSocket = require('ws');

const init = (port) => {
    console.log("Websocket server initiated");
    const wss = new WebSocket.Server({ port });
    wss.on("connection", (socket) => {
        console.log("A client has been connected!");

        socket.on('error', console.error)
        socket.on('message', message => onMessage(wss, socket, message))
        socket.on('close', message => onClose(wss, socket, message));
    })
}

const channels = {};

const send = (wsClient, type, body) => {
    wsClient.send(JSON.stringify({ type, body }))
}

const onMessage = (wss, socket, message) => {
    const parsedMessage = JSON.parse(message);
    const { type, body } = parsedMessage
    const { channelName, userName } = body

    switch (type) {
        case 'join': {
            console.log("A user has joined");
            if (!channels[channelName]) {
                channels[channelName] = {}
            }
            channels[channelName][userName] = socket
            const userNames = Object.keys(channels[channelName]);
            send(socket, 'joined', userNames)
            break;
        }
        case 'quit': {
            if (channels[channelName]) {
                channels[channelName][userName] = null
                const userNames = Object.keys(channels[channelName]);
                if (!userNames.length) {
                    delete channels[channelName]
                }
            }
            break;
        }
        case 'send_offer': {
            console.log(
                "send_offer event received"
            );
            const { sdp } = body
            const userNames = Object.keys(channels[channelName]);
            userNames.forEach(uName => {
                if (uName.toString() !== userName.toString()) {
                    const wsClient = channels[channelName][uName];
                    send(wsClient, "offer_sdp_received", sdp)
                }
            })
            break;
        }
        case 'send_answer': {
            const { sdp } = body
            const userNames = Object.keys(channels[channelName]);
            userNames.forEach(uName => {
                if (uName.toString() !== userName.toString()) {
                    const wsClient = channels[channelName][uName];
                    send(wsClient, "answer_sdp_received", sdp)
                }
            })
            break;
        }
        case 'send_ice_candidate': {
            const { candidate } = body
            const userNames = Object.keys(channels[channelName]);
            userNames.forEach(uName => {
                if (uName.toString() !== userName.toString()) {
                    const wsClient = channels[channelName][uName];
                    send(wsClient, "ice_candidate_received", candidate)
                }
            })
            break;
        }
        default:
            break
    }


}

const onClose = (wss, socket, message) => {
    console.log("onClose", message);
    Object.keys(channels).forEach(cname => {
        Object.keys(channels[cname]).forEach(uid => {
            if (channels[cname][uid] === socket) {
                delete channels[cname][uid]
            }
        })
    })
}

module.exports = { init }