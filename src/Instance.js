import React, { Component } from 'react';
// import Grid from '@material-ui/core/Grid';
import Alert from './Alert';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import DeleteSweepIcon from '@material-ui/icons/DeleteSweep';
import Tooltip from '@material-ui/core/Tooltip';
// import { observer } from 'mobx-react';
// import { runInAction } from 'mobx';
import Messages from './Messages';
import RegisteredEvents from './RegisteredEvents';
import uuid from 'uuid';
import './App.scss';
import moment from 'moment';
// import Header from './Header';
import AddEvent from './AddEvent'
import SendMessage from './MessageSending/SendMessage'
// import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';
// import { blue, green, grey } from '@material-ui/core/colors';
// import io from 'socket.io-client';
// import state from './global';
// import { handleAlertCloseAction, createAlertAction } from './global'






export default class Instance extends Component {



    connect = (address) => {
        console.log('connecting');

        state.connectionStatus = 'connecting';

        if (socket) {
            socket.disconnect();
        }

        socket = window.socket = io(address);

        this.originalOnevent = socket.onevent;//Create a reference to the original onevent function of SocketIO, to be used by the "listen to all events" mechanism.


        socket.on('connect', () => {
            console.log('connected!')

            state.connectionStatus = 'connected';

        });


        socket.on('disconnect', (reason) => {
            console.log('reason', reason)
            if (reason === 'io server disconnect') {
                socket.disconnect();
            }
            // else the socket will automatically try to reconnect
        });


        socket.on('connect_error', (error) => {
            console.log('Error connecting!', state)

            createAlertAction('error', 'Error connecting to the server');

        });


        socket.on('reconnect', (attemptNumber) => {
            console.log('reconnected');

            state.alertOpen = false;
            state.connectionStatus = 'connected';

        });


        socket.on('reconnecting', (attemptNumber) => {
            console.log('reconnecting');

            state.connectionStatus = "reconnecting";
        });


        if (Object.keys(this.state.registeredEvents).length > 0) {//PROBLEM!!!!!!!! fix it
            console.log('re-registering events');
            for (let event of Object.keys(this.state.registeredEvents)) {
                this.registerEvent(event);
            }
        }

    }


    registerEvent = (eventName) => {
        // console.log('registering event:', eventName)
        this.registerEventCallback(eventName);

        this.setState((state) => ({
            registeredEvents: { ...state.registeredEvents, [eventName]: { name: eventName } }
        }))


    }

    registerEventCallback = (eventName) => {
        if (socket) {
            socket.off(eventName);
            socket.on(eventName, (data) => {
                const id = uuid();
                console.log('on:', eventName)
                this.addMessageToState(id, eventName, data, false)
            })
        }

    }

    registerAnonymousEvent = (eventName) => {//This registers a callback for an event coming from SocketIO's Socket.prototype.onevent function.
        console.log('registering anonymous event:', eventName)
        this.registerEventCallback(eventName);
        // debugger;
        this.setState((state) => ({
            anonymousEvents: { ...state.anonymousEvents, [eventName]: { name: eventName } }
        }))

    }


    unregisterAnonymousEvents = () => {
        // debugger;
        for (let event in this.state.anonymousEvents) {
            if (!this.state.registeredEvents.hasOwnProperty(event)) {
                socket.off(event)
            }

        }
        this.setState((state) => ({
            anonymousEvents: {}
        }))
    }



    onMessagesDelete = () => {
        this.setState((state) => {
            return {
                ...state,
                messages: []
            }
        })
    }



    onConnectSubmit = (address) => {
        this.connect(address);
    }


    onDisconnectSubmit = () => {
        console.log('disconnected manually')
        socket.disconnect();
        // this.setState({ connectionStatus: 'disconnected' })
        state.connectionStatus = 'disconnected';

    }

    onMessageSubmit = (eventName, message) => {
        const id = uuid();
        this.addMessageToState(id, eventName, message, true);
        this.sendMessageToServer(id, eventName, message);
    }

    addMessageToState = (id, eventName, data, owner) => {

        const time = this.getTime();
        this.setState((state, props) => ({
            ...state,
            messages: [...state.messages, { id, eventName, time, data, owner, status: 'pending' }]
        }))

        // document.querySelector('#dummy').scrollIntoView({ behavior: 'smooth' })
    }

    sendMessageToServer = (id, eventName, message) => {
        const callback = (data) => {
            // debugger;
            console.log('data from callback', data)
            this.changeMessage(id, 'status', 'success');
        }
        socket.emit(eventName, message, callback)
    }

    changeMessage = (messageId, prop, value) => {
        this.setState((state) => {
            const messages = state.messages.map((message) => {
                if (message.id === messageId) {
                    return {
                        ...message,
                        [prop]: value
                    }
                } else {
                    return message;
                }
            })
            return {
                messages
            }
        })
    }

    onChange = (e) => {
        const name = e.target.name;
        const value = e.target.value;
        this.setState({
            [name]: value
        })
    }


    onEventSubmit = (eventName) => {
        console.log(eventName)
        this.registerEvent(eventName);
    }

    onEventDelete = (name) => {
        // this.setState()
        // debugger;
        socket.off(name);

        const oldEvents = { ...this.state.registeredEvents };
        delete oldEvents[name];
        this.setState({
            registeredEvents: oldEvents
        })
    }




    listenToAllEvents = (on) => {

        const that = this;

        if (on) {

            socket.onevent = function (packet) {//This intercepts the original onevent function, which gets fired on every incoming event.
                const eventName = packet.data[0];//Extracts the event name.

                const eventData = packet.data[1];//Extracts the data.

                that.registerAnonymousEvent(eventName, eventData)//Registers the event

                that.originalOnevent.call(this, packet);//Calls the original onevent function, for normal application flow.

            };

        } else {
            socket.onevent = that.originalOnevent;

            that.unregisterAnonymousEvents()

        }

    }



    handleAllEventsCheck = name => event => {
        this.setState({ [name]: event.target.checked });
        this.listenToAllEvents(event.target.checked)
    };

    getTime = () => {

        const unix = this.getMoment();
        return moment(unix * 1000).format('HH:mm');
    }


    getMoment = () => {

        return moment().unix();

    }



    handleAlertClose = (event, reason) => {
        handleAlertCloseAction(event, reason);
    };



    render() {

        const { connectionStatus, allEventsChecked, registeredEvents, messages } = this.props;

        return (

            <React.Fragment>

                <div className="special_scroll" id="panel">

                    <div id="send_messages">
                        <Typography gutterBottom variant="h6">Send messages</Typography>
                        <SendMessage connected={connectionStatus === 'connected'} onSubmit={this.onMessageSubmit}></SendMessage>

                    </div>

                    <div id="events">
                        <Typography gutterBottom variant="h6">Register events</Typography>

                        <FormControlLabel
                            control={
                                <Checkbox
                                    disabled={connectionStatus !== 'connected'}
                                    checked={allEventsChecked}
                                    onChange={this.props.handleAllEventsCheck('allEventsChecked')}
                                    value="allEventsChecked"
                                    color="primary"
                                />
                            }

                            label="Listen to all incoming events"
                        />

                        <AddEvent connected={connectionStatus === 'connected'} onSubmit={this.onEventSubmit}></AddEvent>
                        {Object.keys(registeredEvents).length > 0 && (

                            <div id="registered_events" >
                                <RegisteredEvents onEventDelete={this.onEventDelete} events={Object.values(registeredEvents)}></RegisteredEvents>
                            </div>

                        )}
                    </div>
                </div>

                <div className="special_scroll" id="messages">

                    <Typography variant="h6" gutterBottom>
                        Messages sent/received
                {messages.length > 0 && (
                            <div style={{ float: 'right' }}>

                                <Tooltip title="Delete all messages">
                                    <IconButton onClick={this.onMessagesDelete} aria-label="Delete">
                                        <DeleteSweepIcon fontSize="small" color="secondary"></DeleteSweepIcon>
                                    </IconButton>
                                </Tooltip>
                            </div>
                        )}

                    </Typography>

                    <Messages messages={messages} />
                    <div style={{ float: "left", clear: "both" }} id="dummy">

                    </div>

                </div>
            </React.Fragment>







        );
    }
}







