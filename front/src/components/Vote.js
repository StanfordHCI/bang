import React,{Component} from 'react';
import Notification from 'react-web-notification';

class Vote extends Component{
    constructor(props){
        super(props);
        const {options} = this.props;
        this.state = {
            options: [],
            isStartNotifySent: false,
            disabled: false,
        }
        this.setOptions(options)
    }

    setOptions(options) {
        const opts = options ? options.map(x => {return {label: x.label, value: x.value, votes: 0}}).filter(y => !y.label.includes('(you)')) : [];
        this.setState({options: opts});
        return opts;
    }

    componentWillReceiveProps(nextProps, nextContext) {
        const {vote, batch, user, lockCap, poll, pollInd} = this.props;
        console.log('batch:', batch)
        this.setOptions(nextProps.options);
        let votes;
        try {
            votes = batch.rounds[batch.currentRound - 1].teams.find(x => x.users.some(y => y.user.toString() === user._id)).currentPollVotes[pollInd] || [];
        } catch (e) {
            votes = []
        }
        const disabled = Object.values(votes).some(x => +x >= lockCap);
        if (disabled !== this.state.disabled) {
            console.log('votes:', votes);
            this.props.onDisable(pollInd);
            this.setState({disabled: true})
        }
    }

    componentDidMount() {
        // just getting the votes not actually voting
        this.props.vote(Object.assign({value: null, pollInd: this.props.pollInd}, {batch: this.props.batch, pollInd: this.props.pollInd}));
        this.setOptions(this.props.options)
    }

    render(){
        const {vote, batch, user, lockCap, poll, pollInd} = this.props;
        let votes;
        try {
            votes = batch.rounds[batch.currentRound - 1].teams.find(x => x.users
                .some(y => y.user.toString() === user._id)).currentPollVotes[pollInd];
        } catch (e) {
            votes = [];
        }
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
        return(
            <div>
                <div className="languages">
                    {
                        this.state.options.map((option, i) =>
                            <button
                                disabled={disabled}
                                onClick={() => {vote(Object.assign(option, {batch: batch, pollInd: pollInd}))}}>
                                    {option.label}({votes[option.value.toString()]  ? votes[option.value.toString()] : 0})
                            </button>

                        )
                    }
                </div>
                {(poll.type === 'foreperson' && disabled) &&
                <p><b style={{color: 'black', textAlign: 'left'}}>{foreperson}</b> is the presiding juror</p>}
            </div>
        );
    }
}
export default Vote;