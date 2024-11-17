"use client"

import { useEffect, useRef } from "react";
import { useSearchParams } from 'next/navigation'

const URL_WEB_SOCKET = "ws://<Your IP Address>:8090/ws";

let localStream;
let localPeerConnection;

export default () => {
    const ws = useRef(null);
    const searchParams = useSearchParams();

    useEffect(() => {
        const wsClient = new WebSocket(URL_WEB_SOCKET);
        wsClient.onopen = () => {
            console.log("ws opened");
            ws.current = wsClient;
            setupDevice();
        }
        wsClient.onclose = () => console.log("Ws closed");
        wsClient.onmessage = (message) => {
            const parsedMessage = JSON.parse(message.data);

            const { type, body } = parsedMessage

            switch (type) {
                case 'joined':
                    console.log("Users in this channel", body);
                    break;
                case 'offer_sdp_received':
                    const offer = body
                    onAnswer(offer)
                    break;
                case 'answer_sdp_received':
                    gotRemoteDescription(body)
                    break;
                case 'ice_candidate_received':
                    break;

            }
        }
    }, [])

    const gotRemoteDescription = answer => {
        localPeerConnection.setRemoteDescription(answer)
        localPeerConnection.onaddstream = gotRemoteStream
    }

    const onAnswer = (offer) => {
        console.log("onAnswer invoked");
        localPeerConnection = new RTCPeerConnection([], pcConstraints)
        localPeerConnection.onicecandidate = gotLocalIceCandidateAnswer
        localPeerConnection.onaddstream = gotRemoteStream
        localPeerConnection.addStream(localStream)
        localPeerConnection.setRemoteDescription(offer)
        localPeerConnection.createAnswer().then(answer => gotAnswerDescription(answer))

    }

    const gotAnswerDescription = (answer) => {
        localPeerConnection.setLocalDescription(answer);
    }

    const gotLocalIceCandidateAnswer = (event) => {
        if (!event.candidate) {
            const answer = localPeerConnection.localDescription;
            sendWsMessage('send_answer', {
                channelName: searchParams.get('channelName'),
                userName: searchParams.get('userName'),
                sdp: answer
            })
        }
    }

    const sendWsMessage = (type, body) => {
        ws.current.send(JSON.stringify({ type, body }))
    }

    const pcConstraints = {
        'optional': [
            { 'DtlsSrtpKeyAgreement': true }
        ]
    }

    const setupPeerConnection = () => {
        console.log("Setting up peer connection");
        localPeerConnection = new RTCPeerConnection([], pcConstraints)
        localPeerConnection.onicecandidate = gotLocalIceCandidateOffer
        localPeerConnection.onaddstream = gotRemoteStream
        localPeerConnection.addStream(localStream);
        localPeerConnection.createOffer().then(gotLocalDescription)
    }

    const gotLocalDescription = (offer) => {
        localPeerConnection.setLocalDescription(offer)
    }

    const gotRemoteStream = (event) => {
        const remotePlayer = document.getElementById('peerPlayer');
        remotePlayer.srcObject = event.stream
    }

    const gotLocalIceCandidateOffer = (event) => {
        console.log('event: ', event);
        if (!event.candidate) {
            const offer = localPeerConnection.localDescription;
            sendWsMessage('send_offer', {
                channelName: searchParams.get('channelName'),
                userName: searchParams.get('userName'),
                sdp: offer
            })

        }
    }

    const setupDevice = () => {
        navigator.getUserMedia({ audio: true, video: true }, (stream) => {
            const localPlayer = document.getElementById('localPlayer');
            localPlayer.srcObject = stream
            localStream = stream;
            ws.current.send(JSON.stringify({
                type: 'join',
                body: {
                    channelName: searchParams.get('channelName'),
                    userName: searchParams.get('userName')
                }
            }))
            setupPeerConnection()
        }, (err) => {
            console.log('err: ', err);

        })
    }


    return (
        <div className="flex flex-row w-100 justify-center items-center m-auto p-8 h-screen">
            <div className="flex flex-row">
                <video id="localPlayer" autoPlay style={{ width: 640, height: 480 }} />
            </div>
            <div className="flex flex-row">
                <video id="peerPlayer" autoPlay style={{ width: 640, height: 480 }} />
            </div>
        </div>
    );
}