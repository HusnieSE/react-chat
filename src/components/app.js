import React, { Component } from "react";
// import emojione from "emojione";
import { connect } from "react-redux";
import { ToastContainer } from "react-toastr";
import moment from "moment";

import * as Actions from "../actions";
import ChatContent from "./ChatContent";
import Login from "./Login";
import ChatInput from "./ChatInput";
import ChatNav from "./ChatNav";
import UserList from "./UserList";
import "./app.css";

class App extends Component {
    constructor(props) {
        super(props);

        this.ws = null;
        this.state = {
            newMsg: props.new_message, // contains new message to be sent to server
            messages: props.messages, // A running list of chat messages displayed on screen
            email: props.email, // Email address used for grabbing avatar
            username: props.username, // Our username
            joined: props.joined
        };
    }

    componentDidMount() {
        this.getLocalStorageData();
        this.ws = new WebSocket("ws://localhost:8000/ws");

        this.ws.addEventListener("message", e => {
            const payload = JSON.parse(e.data);
            console.log("payload: ", payload);
            switch (payload.type) {
                case "ADD_MESSAGE":
                    this.props.receiveMessage(payload);
                    break;
                case "ADD_USER":
                    this.props.addUser(payload);
                    break;
                case "DELETE_USER":
                    this.props.updateUser(payload);
                    break;
                case "MESSAGE_TO_ALL":
                    this.props.receiveMessage(payload);
                // case "DELETE_USER":
                //     this.props.deleteUser(payload);
                default:
                    break;
            }

            const el = document.getElementById("chat-messages");
            el.scrollTop = el.scrollHeight; // auto-scroll to bottom
        });

        this.ws.onopen = evt => {
            const { email, username } = this.state;
            if (email && username) {
                const type = "ADD_USER";
                const payload = JSON.stringify({
                    type,
                    email,
                    username,
                    time: this.timestamp()
                });
                this.ws.send(payload);
            }
        };
    }

    componentWillReceiveProps(nextProps, _nextContext) {
        const { new_message, messages, email, username, joined } = nextProps;

        this.setState({
            newMsg: new_message,
            messages,
            email,
            username,
            joined
        });
    }

    timestamp() {
        return moment().format("YYYY-MM-DD, hh:mm:ss");
    }

    getLocalStorageData() {
        const email = localStorage.getItem("email");
        const username = localStorage.getItem("username");
        if (localStorage.getItem("email") && localStorage.getItem("username")) {
            this.props.handleChangeEmail(email);
            this.props.handleChangeUsername(username);
            this.props.handleJoin(true);
        }
    }

    send() {
        const { newMsg, email, username } = this.state;
        const { to } = this.props;
        let toId = 0;
        let type;
        if (to.name === "All") {
            type = "MESSAGE_TO_ALL";
        } else {
            type = "ADD_MESSAGE";
            toId = to.user.id;
        }

        const json = JSON.stringify({
            to: toId,
            email,
            username,
            message: newMsg,
            type,
            time: this.timestamp()
        });

        console.log("json: ", json);

        if (newMsg !== "") {
            this.ws.send(
                JSON.stringify({
                    to: toId,
                    email,
                    username,
                    message: newMsg,
                    type,
                    time: this.timestamp()
                })
            );

            // reset newMsg
            this.props.handleChangeNewMessage("");
        }
    }

    join() {
        const { email, username } = this.state;
        const type = "ADD_USER";

        if (!email && username) {
            this.toastr.error(
                "You must enter an email address",
                "Login Failed",
                {
                    closeButton: true,
                    timeout: 30000,
                    extendedTimeOut: 10000
                }
            );
            return;
        }

        if (!username && email) {
            this.toastr.error("You must enter a username", "Login Failed", {
                closeButton: true,
                timeout: 30000,
                extendedTimeOut: 10000
            });
            return;
        }

        if (!username && !email) {
            this.toastr.error(
                "You must enter a username and email address",
                "Login Failed",
                {
                    closeButton: true,
                    timeout: 30000,
                    extendedTimeOut: 10000
                }
            );
            return;
        }

        this.props.handleJoin(true);

        const payload = JSON.stringify({
            type,
            email,
            username,
            time: this.timestamp()
        });
        this.ws.send(payload);
    }

    updateEmail(e) {
        this.props.handleChangeEmail(e.target.value);
    }

    updateUsername(e) {
        this.props.handleChangeUsername(e.target.value);
    }

    updateMsg(e) {
        this.props.handleChangeNewMessage(e.target.value);
    }

    render() {
        return (
            <div>
                <ToastContainer
                    ref={ref => (this.toastr = ref)}
                    className="toast-top-right"
                />
                <header>
                    <ChatNav>
                        <div className="navbar-header">
                            <a href="#" className="navbar-brand">
                                Go Chat
                            </a>
                        </div>
                        {!this.state.joined && (
                            <Login
                                updateEmail={e => this.updateEmail(e)}
                                updateUsername={e => this.updateUsername(e)}
                                handleLogin={() => this.join()}
                                username={this.state.username}
                                email={this.state.email}
                            />
                        )}
                    </ChatNav>
                </header>
                <div className="container">
                    <div className="row">
                        <ChatContent messages={this.state.messages} />
                        <UserList />
                    </div>
                    {this.state.joined && (
                        <ChatInput
                            value={this.state.newMsg}
                            sendMessage={() => this.send()}
                            updateMsg={e => this.updateMsg(e)}
                        />
                    )}
                </div>
                <footer className="footer">Powered by Go</footer>
            </div>
        );
    }
}

function mapStateToProps(state) {
    return state;
}

export default connect(mapStateToProps, Actions)(App);
