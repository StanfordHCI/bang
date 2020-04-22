import React, {Component} from 'react';
import CasualForm from '../components/CasualForm';
import {Collapse, Button} from "reactstrap";

class Vote extends Component {
    constructor(props) {
        super(props);
        const {options} = this.props;
        this.state = {
            open: false,
            options: [],
            isStartNotifySent: false,
            disabled: false,
            warnings: {
                'casual': <div>
                    <p style={{color: 'grey'}}>You should all try to agree.</p>
                    <p style={{color: 'grey'}}>However, please do not give up your honest beliefs.</p>
                </div>
            },
            votes: [],
            questionResult: null,
            selectedOption: null,

        };
        this.casualFormSave = this.casualFormSave.bind(this);
        this.openPoll = this.openPoll.bind(this);
        if (options) {
            this.setOptions(options)
        }
    }

    openPoll() {
        const {open} = this.state;
        if (open) {
            this.setState({open: false});
        } else {
            this.setState({open: true});
        }

    }

    setOptions(options) {
        const opts = options ? options.map(x => {
            return {label: x.label, value: x.value, votes: 0}
        }).filter(y => !y.label.includes('(you)')) : [];
        this.setState({options: opts});
        return opts;
    }

    componentWillReceiveProps(nextProps, nextContext) {
        const {batch, user, lockCap, pollInd, options} = this.props;
        if (JSON.stringify(nextProps.options) !== JSON.stringify(this.props.options)) {
            this.setState({
                disabled: false,
            })
        }
        if (options) {
            this.setOptions(nextProps.options);
        }
        let votes;
        try {
            votes = batch.rounds[batch.currentRound - 1].teams.find(x => x.users.some(y => y.user.toString() === user._id)).currentPollVotes[pollInd] || [];
        } catch (e) {
            votes = []
        }
        delete votes.user;
        this.setState({votes: votes});
        const disabled = Object.values(votes).some(x => +x >= lockCap);
        if (disabled !== this.state.disabled) {
            this.setState({disabled: true})
        }
    }

    componentDidMount() {
        const {poll} = this.props;
        // just getting the votes on page reload, not actually voting
        this.props.vote(Object.assign({value: null, pollInd: this.props.pollInd}, {
            batch: this.props.batch,
            pollInd: this.props.pollInd
        }));
        if (poll.type === "foreperson") {
            this.setOptions(this.props.options)
        }
    }

    handleVote(option, question) {
        const {vote, batch, pollInd} = this.props;
        const obj = Object.assign(option, {type: "primary"}, {
            batch: {
                _id: batch._id,
                rounds: batch.rounds,
                currentRound: batch.currentRound
            }, pollInd: pollInd
        });
        vote(obj);
        if(this.state.disabled){
            this.setState({disabled: false})
        }
        this.setState({questionResult: question, selectedOption: option});
    }

    casualFormSave(data) {
        const {voteCasualForm, batch, pollInd} = this.props;
        voteCasualForm(Object.assign(data, {
            batch: {
                _id: batch._id,
                rounds: batch.rounds,
                currentRound: batch.currentRound
            }, pollInd: pollInd
        }));
    }

    render() {
        const {user, poll, actualTeamSize} = this.props;
        let votes = this.state.votes;
        if (!votes) {
            votes = []
        }


        let foreperson;
        const disabled = this.state.disabled;
        if (disabled && poll.type === 'foreperson') {
            const obj = votes;
            foreperson = Object.keys(obj).reduce((a, b) => obj[a] > obj[b] ? a : b); // foreperson - user with max votes
            if (foreperson === user.fakeNick) {
                foreperson = user.realNick;
            }
        }
        let result = '';
        if (disabled && poll.type !== 'foreperson') {
            const obj = votes;
            result = Object.keys(obj).reduce((a, b) => obj[a] > obj[b] ? a : b); // foreperson - user with max votes
            const primary_question = this.props.poll.questions.find(question => question.type === "primary");
            result = primary_question.selectOptions[Number(result)].label;
        }
        return <div>
            {/*HEADER*/}
            <h5 style={{color: 'black', textAlign: 'left'}}>
                {poll.type === 'foreperson' && !this.state.disabled && 'It\'s time to choose a Foreperson!'}
                {poll.type === 'foreperson' && this.state.disabled && foreperson && `${foreperson} is the Foreperson!`}
                {poll.type === 'casual' && !this.state.disabled && 'Time to Decide the Verdict!'}
                {poll.type === 'casual' && this.state.disabled && `Verdict: ${result}`}
            </h5>
            <div>
                {(disabled && poll.type === 'foreperson') &&
                <p style={{color: 'grey', textAlign: 'center', lineHeight: '180%'}}>
                    Based on a vote in this team, <b>{foreperson}</b> will be the foreperson.{'\n'}
                    At the end of the deliberation, <b>{foreperson}</b> should make sure that everyone is in the
                    agreement
                </p>}
            </div>
            {/*POLL TEXT OR FOREPERSON TEXT*/}
            <Button color="primary" onClick={this.openPoll} size="sm">
                {this.state.open ? 'Collapse -' : 'Expand +'}
            </Button>
            <Collapse isOpen={this.state.open}>
                {
                    (poll.type === 'casual') &&
                    <React.Fragment>
                        {poll.questions.map(question => {
                            if (question.type === "primary") {
                                return <React.Fragment>
                                    <p style={{
                                        color: 'grey',
                                        textAlign: 'center',
                                        lineHeight: '180%'
                                    }}>{question.text}</p>
                                    {/*BUTTONS*/}
                                    <div className="languages">
                                        {(poll.type === 'casual') &&
                                        question.selectOptions.map((option, i) => {
                                            let style;
                                            if (this.state.questionResult && this.state.selectedOption.value === option.value) {
                                                style = {backgroundColor: 'grey'};
                                            } else {
                                                style = {}
                                            }
                                            return <button
                                                style={style}
                                                onClick={() => {
                                                    this.handleVote(option, question)
                                                }}>
                                                {option.label + ' '}
                                                ({this.state.votes && this.state.votes[option.value.toString()] ?
                                                (this.state.votes[option.value.toString()] / actualTeamSize * 100).toFixed(2) : 0}%)
                                            </button>
                                        })
                                        }
                                    </div>

                                </React.Fragment>
                            }
                        })}
                        {poll.type === 'casual' &&
                        <CasualForm onSubmit={this.casualFormSave} questions={poll.questions
                            .filter(q => q.type !== 1)}/>}
                    </React.Fragment>
                }
                {
                    (poll.type === "foreperson") &&
                    <React.Fragment>
                        <div className="languages">
                            {(!this.state.disabled || poll.type === 'casual') &&
                            this.state.options.map((option, i) => {
                                let style;
                                if (this.state.selectedOption && this.state.selectedOption.value === option.value) {
                                    style = {backgroundColor: 'grey'}
                                } else {
                                    style = {}
                                }
                                return <button
                                    style={style}
                                    disabled={disabled}
                                    onClick={() => {
                                        this.handleVote(option)
                                    }}>
                                    {option.label + ' '}({this.state.votes && this.state.votes[option.value.toString()] ?
                                    (this.state.votes[option.value.toString()] / actualTeamSize * 100).toFixed(2) : 0}%)
                                </button>
                            })
                            }
                        </div>
                    </React.Fragment>
                }
                {(this.props.warning && !disabled) && this.state.warnings[this.props.warning]}
            </Collapse>
        </div>;
        {/*WARNING FOR CASUAL POLLS*/
        }
    }
}

export default Vote
