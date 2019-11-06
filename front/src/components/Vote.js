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
        const {vote, batch, user, lockCap, poll} = this.props;
        this.setOptions(nextProps.options)
        const votes = batch.rounds[batch.currentRound - 1].teams.find(x => x.users.some(y => y.user.toString() === user._id)).currentPollVotes || [];
        const disabled = Object.values(votes).some(x => x >= lockCap) && poll.type === 'foreperson';
        if (disabled !== this.state.disabled) {
            this.props.onDisable()
            this.setState({disabled: true})
        }
    }

    componentDidMount() {
        this.props.vote(Object.assign({value: null}, {batch: this.props.batch})); // just getting the votes not actually voting
        this.setOptions(this.props.options)
    }

    render(){
        const {vote, batch, user, lockCap, poll} = this.props;
        const votes = batch.rounds[batch.currentRound - 1].teams.find(x => x.users.some(y => y.user.toString() === user._id)).currentPollVotes || [];

        let foreperson;
        const disabled = this.state.disabled;
        if (disabled && poll.type === 'foreperson') {
            const obj = votes;
            foreperson = Object.keys(obj).reduce((a, b) => obj[a] > obj[b] ? a : b);
        }

        return(
            <div>
                <div className="languages">
                    {
                        this.state.options.map((option, i) =>
                            <button
                                disabled={disabled}
                                onClick={() => {vote(Object.assign(option, {batch: batch}))}}>
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