import React, {Component} from 'react';
import CasualForm from '../components/CasualForm';
import {bindActionCreators} from "redux";
import {voteCasualForm} from "Actions/batches";
import {connect} from "react-redux";

class Vote extends Component {
    constructor(props) {
        super(props);
        const {options} = this.props;
        this.state = {
            options: [],
            isStartNotifySent: false,
            disabled: false,
            warnings: {
                'casual': <div>
                    <p style={{color: 'red'}}>Warning: not everyone is in agreement.</p>
                    <p style={{color: 'grey'}}>You should all be in agreement before the round ends!</p>
                </div>
            },
            votes: [],
            questionResult: null,
            selectedOption: null,

        };
        this.casualFormSave = this.casualFormSave.bind(this);
        // this.setOptions(options)
    }

    setOptions(options) {
        const opts = options ? options.map(x => {
            return {label: x.label, value: x.value, votes: 0}
        }).filter(y => !y.label.includes('(you)')) : [];
        this.setState({options: opts});
        return opts;
    }

    componentWillReceiveProps(nextProps, nextContext) {
        const {batch, user, lockCap, pollInd} = this.props;
        if (JSON.stringify(nextProps.options) !== JSON.stringify(this.props.options)) {
            this.setState({
                disabled: false,
            })
        }
        //this.setOptions(nextProps.options);
        let votes;
        try {
            votes = batch.rounds[batch.currentRound - 1].teams.find(x => x.users.some(y => y.user.toString() === user._id)).currentPollVotes[pollInd] || [];
        } catch (e) {
            votes = []
        }
        delete votes.user;
        this.setState({votes: votes});
        const disabled = Object.values(votes).some(x => +x >= lockCap);
        // if (disabled !== this.state.disabled) {
        //     this.props.onDisable(pollInd);
        //     this.setState({disabled: true})
        // }
    }

    componentDidMount() {
        // just getting the votes on page reload, not actually voting
        this.props.vote(Object.assign({value: null, pollInd: this.props.pollInd}, {
            batch: this.props.batch,
            pollInd: this.props.pollInd
        }));
        // this.setOptions(this.props.options)
    }

    handleVote(option, question) {
        const {questionsResult} = this.state;
        const {vote, batch, pollInd} = this.props;
        const obj = Object.assign(option, {
            batch: {
                _id: batch._id,
                rounds: batch.rounds,
                currentRound: batch.currentRound
            }, pollInd: pollInd
        });
        vote(obj);
        this.setState({questionResult: question, selectedOption: option});
    }

    casualFormSave(data){
        const {voteCasualForm, batch, pollInd} = this.props;
        data.questions.map(question=>{
           if (Array.isArray(question.result)){
               let result = [];
               question.result.forEach((x,index)=> {
                    result.push(index);
               });
               delete question.result;
               question.result_array = result;
           }
        });
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
        const {questionsResult} = this.state;
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
            result = this.state.selectedOption.label
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
            {
                (poll.type === 'casual') &&
                <React.Fragment>
                    {poll.questions.map(question => {
                        if (question.type === 1) {
                            return <React.Fragment>
                                <div>
                                    <p style={{
                                        color: 'grey',
                                        textAlign: 'center',
                                        lineHeight: '180%'
                                    }}>{question.text}</p>
                                </div>
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
                                            disabled={disabled}
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
                    {poll.type === 'casual' && <CasualForm onSubmit={this.casualFormSave} questions={poll.questions}/>}
                </React.Fragment>
            }
            {(this.props.warning && !disabled) && this.state.warnings[this.props.warning]}

        </div>;
        {/*WARNING FOR CASUAL POLLS*/
        }
    }
}


function mapDispatchToProps(dispatch) {
    return bindActionCreators({
        voteCasualForm,
    }, dispatch);
}

export default connect(null, mapDispatchToProps)(Vote);
