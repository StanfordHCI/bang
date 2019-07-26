/** FAQ.js
 *
 * FAQ Questions
 *
 * */

import React, { Component } from "react";
import { connect } from "react-redux";
import { Button, Card, CardBody, Container, Col, Row } from "reactstrap";

class Faq extends Component {
  //PureComponent {

  constructor(props) {
    super(props);
  }


  render() {
    const pStyle = {
      paddingTop: '50px',
      textAlign: 'left',
    };

    return (
      <Container className="faq" style={pStyle}>
            <h1>Frequently Asked Questions</h1>
            <p>Hello! Thanks for coming to our FAQ page. We are always
                trying to make our tasks better and more clear. We put together this 
                FAQ to answer your questions. Please feel free to email us if your question isn't listed here.
            </p>
            <br></br>
            <h2>Why do we have to wait?</h2>
            <p>This experiment is a group task, and we need enough people to be online at the same time so that they can collaborate with each other! The reason you’re waiting is because we need to get enough people to collaborate in groups, and then everyone can start at the same time. 
            </p>
            <h2>What is the purpose of helperBot/Waiting room?</h2>
            <p>The bot and waiting room lets us know that users are engaged in the task and that we can move forward to the main experiment once enough are ready. </p>
            <p>We realize that the attention checks from the helperBot can be a little bit annoying, but it’s the best way for us to make sure that you’re ready to go so that the experiment will run smoothly from the get-go. </p>
            <h2>Will I be paid for waiting?</h2>
            <p>Yes, you will be paid $1 for waiting if we get enough people. </p>
            <h2>How much will I be paid for the task?</h2>
            <p>Provided you stay for the entire task, we will bonus at a rate of $12/hr.</p>
            <h2>I was waiting. Why did the task cancel?</h2>
            <p>To prevent excessive waiting, we will cancel the task if we don't get enough users
              to begin the task. As we stated before, you will be paid $1 for waiting. </p>
   
      </Container>
    );
  }
}

function mapStateToProps(state) {

}

function mapDispatchToProps(dispatch) {

}

export default connect(mapStateToProps, mapDispatchToProps)(Faq);


