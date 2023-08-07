import React, { useState } from 'react';
import { Button, Form } from 'semantic-ui-react'
import { Link } from 'react-router-dom';
import { FormErrors } from './FormErrors';

export default function AskLLM() {
  return (<AskBard />);
}

class AskBard extends React.Component {

    constructor(props) {
      super(props);
  
      this.state = {
        prompt: '',
        promptValid: false,
        formErrors: {prompt: ''},
        formValid: false,
        promptresponse: '...'
      }

      this.handleChange = this.handleChange.bind(this);
      this.handleSubmit = this.handleSubmit.bind(this);
    }

  refresh() {
    window.location.reload();
  }
  
  handleChange(event) {
    const target = event.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;
  
    this.setState(
      {[name]: value, }, () => { this.validateField(name, value)});
    };
  

  validateField(fieldName, value) {
    let fieldValidationErrors = this.state.formErrors;
    let promptValid = this.state.promptValid;
  
    switch(fieldName) {
      case 'prompt':
        promptValid = value.length >= 2;
        fieldValidationErrors.promptValid = promptValid ? '': ' a prompt is should have at least 2 characters';
        break;
      default:
        break;
    }
    this.setState({formErrors: fieldValidationErrors,
                    promptValid: promptValid
                  }, this.validateForm);
  }


  validateForm() {
    this.setState({formValid: this.state.promptValid});
  }
  
  errorClass(error) {
    return(error.length === 0 ? '' : 'has-error');
  }

  handleSubmit(event) {
    let response = window.$.get(`https://${process.env.REACT_APP_LLMHELPER_URL}/api/llm-helper/:Prompt=${encodeURIComponent(this.state.prompt)}`);
    console.log("Réponse LLM");
    console.log(`https://${process.env.REACT_APP_LLMHELPER_URL}/api/llm-helper/:Prompt=${encodeURIComponent(this.state.prompt)}`);
    console.log(response);

    //let response = `https://${process.env.REACT_APP_LLMHELPER_URL}/api/llm-helper/:Prompt=${encodeURIComponent(this.state.prompt)}`;
    //this.setState({promptresponse: "test"});
    window.$.get(`https://${process.env.REACT_APP_LLMHELPER_URL}/api/llm-helper/:Prompt=${encodeURIComponent(this.state.prompt)}`, res => {  
     console.log("Réponse LLM2"); 
     console.log(res);
      this.setState({
        promptresponse: res
      });
    });

  }


  render() {


    return (
      <div className="container">
          <div className="col-xs-8 col-xs-offset-2 jumbotron"> 
            <div className="col-lg-12">


              <div class="topnav" id="myTopnav">
                <Link to='/' size='0'>List Quotes</Link>
                <Link to='/insertwriter' size='0'>Insert Writer</Link>
                <Link to='/askllm' class="active" size='0'>Ask LLM</Link>                
                <a onClick={this.refresh}>Refresh </a> 
                <a onClick={this.logout}>Log out</a>

              </div>


              <h3>Ask LLM</h3>
              
              <Form className="create-form" onSubmit={this.handleSubmit} formErrors={this.state.formErrors}>
                <div className="panel panel-default">
                  <FormErrors formErrors={this.state.formErrors} />
                </div>
                <Form.Field required='true' fluid >
                    <label aline>Hey Quotey who is the writer</label> <br/>
                    <input name='prompt' placeholder='Enter the quote here' value={this.state.prompt} onChange={this.handleChange} style={{width: '350px'}}/>
                    <label name='response'> {this.state.promptresponse} </label>
                </Form.Field><br/>
                <Button type='submit' disabled={!this.state.formValid}>Submit</Button>
              </Form>
          </div>
        </div>
      </div>

    )
}
}

