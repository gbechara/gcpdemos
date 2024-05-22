import React, { useState } from 'react';
import { Button, Form } from 'semantic-ui-react'
import { Link } from 'react-router-dom';
import { FormErrors } from './FormErrors';
import { View, StyleSheet, Text } from 'react-native';
import axios from 'axios';
//import { instanceOf } from 'prop-types';
import { Cookies } from 'react-cookie';
//import Cookies from 'js-cookie';


export default function AskLLM() {
  return (<AskBard />);
}

const cookies = new Cookies();

class AskBard extends React.Component {

    //static propTypes = {
    //  cookies: instanceOf(Cookies).isRequired
    //};


    constructor(props) {
      super(props);

      this.state = {
        prompt: '',
        promptValid: false,
        formErrors: {prompt: ''},
        formValid: false,
        promptresponse: '',
        characterCount: 0,
        promptchatbisonresponse: '',
        prompttextbisonresponse: '',
        // GCP_IAP_UID: cookies.get('GCP_IAP_UID') || 'undefined',
        //GCP_IAP_UID : document.cookie.match("(^|;)\\s*" + "GCP_IAP_UID" + "\\s*=\\s*([^;]+)"),
      }

      this.handleChange = this.handleChange.bind(this);
      this.handleSubmit = this.handleSubmit.bind(this);
      this.callChatBison = this.callChatBison.bind(this);
      this.callTextBison = this.callTextBison.bind(this);
    }

  refresh() {
    window.location.reload();
  }

  /*
 * Create form to request access token from Google's OAuth 2.0 server.
 */
/*componentDidMount(): void {

  var fragmentString = window.location.hash.substring(1);
  
  var params = {};
  
  var regex = /([^&=]+)=([^&]*)/g, m;
  while (m = regex.exec(fragmentString)) {
    params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
  }
  if (Object.keys(params).length > 0) {
    localStorage.setItem('oauth2-test-params', JSON.stringify(params) );
    if (params['state'] && params['state'] == 'try_sample_request') {
      trySampleRequest();
    }
  }
  
  function trySampleRequest() {
    var params = JSON.parse(localStorage.getItem('oauth2-test-params'));
    if (params && params['access_token']) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET',
          'https://www.googleapis.com/drive/v3/about?fields=user&' +
          'access_token=' + params['access_token']);
      xhr.onreadystatechange = function (e) {
        if (xhr.readyState === 4 && xhr.status === 200) {
          console.log(xhr.response);
        } else if (xhr.readyState === 4 && xhr.status === 401) {
          // Token invalid, so prompt for user permission.
          oauth2SignIn();
        }
      };
      xhr.send(null);
    } else {
      oauth2SignIn();
    }
  }
  
  function oauth2SignIn() {
    // Google's OAuth 2.0 endpoint for requesting an access token
    var oauth2Endpoint = 'https://accounts.google.com/o/oauth2/v2/auth';
  
    // Create <form> element to submit parameters to OAuth 2.0 endpoint.
    var form = document.createElement('form');
    form.setAttribute('method', 'GET'); // Send as a GET request.
    form.setAttribute('action', oauth2Endpoint);
  
    // Parameters to pass to OAuth 2.0 endpoint.
    var params = {'client_id': '248688270572-camos4ukonlfrlgnp84ksbbta667gqcu.apps.googleusercontent.com',
                  'redirect_uri': window.location.origin+'/askllm/',
                  'response_type': 'token',
                  'scope': 'https://www.googleapis.com/auth/drive.metadata.readonly',
                  'include_granted_scopes': 'true',
                  'state': 'try_sample_request'};
  
    // Add form parameters as hidden input values.
    for (var p in params) {
      var input = document.createElement('input');
      input.setAttribute('type', 'hidden');
      input.setAttribute('name', p);
      input.setAttribute('value', params[p]);
      form.appendChild(input);
    }
  
    // Add form to page and submit it to open the OAuth 2.0 endpoint.
    document.body.appendChild(form);
    form.submit();
  
  }
  }*/
  
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
  
    this.updateCharacterCount();

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
                  }, this.validateForm,);
  }


  validateForm() {
    this.setState({formValid: this.state.promptValid});
  }
  
  errorClass(error) {
    return(error.length === 0 ? '' : 'has-error');
  }

  updateCharacterCount() {
    this.state.characterCount = this.state.prompt.length;
  }

  handleSubmit(event) {
    /*
    {
      "predictions":[
        {
        "safetyAttributes":{"categories":[],"blocked":false,"scores":[]},
        "citationMetadata":{
          "citations":[
            {"endIndex":148,"startIndex":22,"url":"http://lfop.delidate.it/mr-tonito-2020-mp3.html"}
          ]},
        "content":"Apple Watch Series 7, Apple Watch SE, Apple Watch Series 6, Apple Watch Series 5, Apple Watch Series 4, Apple Watch Series 3, Apple Watch Series 2, Apple Watch Series 1"}]
      }
      format 2 
      {"predictions":[
        {"candidates":[{"content":"The quote  is form the wonderful and extraordinary ","author":"1"}],
        "safetyAttributes":[{"categories":[],"blocked":false,"scores":[]}],
        "citationMetadata":[{"citations":[]}],"content":""}]}
    */

    console.log(`https://${process.env.REACT_APP_LLMHELPER_URL}/api/llm-helper/:Prompt=${encodeURIComponent(this.state.prompt)}`);
    
    /*window.$.get(`https://${process.env.REACT_APP_LLMHELPER_URL}/api/llm-helper/:${encodeURIComponent(this.state.prompt)}`, res => {  
      
      console.log("Réponse LLM2");
      console.log(res); 
      console.log(res.predictions);
      
      if (res.predictions[0].content.length){
        console.log(res.predictions[0].content);
        this.setState({
          promptresponse: res.predictions[0].content
        });
        } else
        {
        console.log(res.predictions[0].candidates[0].content);
        this.setState({
          promptresponse: res.predictions[0].candidates[0].content 
        });      
      };

    });*/


    axios.get(`https://${process.env.REACT_APP_LLMHELPER_URL}/api/llm-helper/:${encodeURIComponent(this.state.prompt)}`,
    //{ withCredentials: true , referrerPolicy: "same-origin"}
    //{ referrerPolicy: "Access-Control-Allow-Origin"}
    //,  
    {
        headers: {
          //'Authorization': localStorage.getItem("access_token")&& localStorage.getItem("access_token")!='undefined'? `Bearer ${localStorage.getItem("access_token")}`:''
          // 'Authorization': (this.state.GCP_IAP_UID!='undefined') ? `Bearer ${this.state.GCP_IAP_UID}`:''
        }
      }
    )
    .then(res => {    
        
        console.log("Réponse LLM2");
        console.log(res.data); 
        console.log(res.data.predictions);
        
        //console.log("this.state.GCP_IAP_UID");
        //console.log(this.state.GCP_IAP_UID);


        if (res.data.predictions[0].content.length){
            console.log(res.data.predictions[0].content);
            this.setState({
              promptresponse: res.data.predictions[0].content
            });
          } else
          {
            console.log(res.data.predictions[0].candidates[0].content);
            this.setState({
              promptresponse: res.data.predictions[0].candidates[0].content 
            });      
          };

      }).catch(function(error){
        console.log("https://${process.env.REACT_APP_LLMHELPER_URL}/api/llm-helper/:${encodeURIComponent(this.state.prompt)}"+error.message);
      });;

  }

  callChatBison(event) {

    console.log(`https://${process.env.REACT_APP_LLMHELPER_URL}/api/llm-helper-chat-bison/:Prompt=${encodeURIComponent(this.state.prompt)}`);
    
    window.$.get(`https://${process.env.REACT_APP_LLMHELPER_URL}/api/llm-helper-chat-bison/:${encodeURIComponent(this.state.prompt)}`, 
    {credentials: "same-origin", referrerPolicy: "origin-when-cross-origin"},
    res => {  
      
      console.log("Réponse LLM2");
      console.log(res); 
      console.log(res.predictions);
      
      console.log(res.predictions[0].candidates[0].content);
      this.setState({
        promptchatbisonresponse: res.predictions[0].candidates[0].content 
      });      

    });

  }

  callTextBison(event) {

    console.log(`https://${process.env.REACT_APP_LLMHELPER_URL}/api/llm-helper-text-bison/:Prompt=${encodeURIComponent(this.state.prompt)}`);
    
    window.$.get(`https://${process.env.REACT_APP_LLMHELPER_URL}/api/llm-helper-text-bison/:${encodeURIComponent(this.state.prompt)}`, 
    {credentials: "include", referrerPolicy: "no-referrer"},
    res => {  
      
      console.log("Réponse LLM2");
      console.log(res); 
      console.log(res.predictions);
      
      console.log(res.predictions[0].content);
      this.setState({
        prompttextbisonresponse: res.predictions[0].content
      });


    });
    
  }

  render() {

    return (
      <div>

              <h3>Ask LLM</h3>
              
              {/* <Form className="create-form" onSubmit={this.handleSubmit} >*/}
              <Form className="create-form">
                <div className="panel panel-default">
                  <FormErrors formErrors={this.state.formErrors} />
                </div>
                <Form.Field >
                    <label>Hey Quotey who is the writer</label> <br/>
                    {/* <input name='prompt' placeholder='Enter the quote here' value={this.state.prompt} onChange={this.handleChange} style={{width: '350px'}}/><br/>*/}
                    <textarea id="prompt" maxLength="350" rows="3" cols="100" placeholder='Enter the quote here' name="prompt"  value={this.state.prompt} onChange={this.handleChange}></textarea>
                    {/* <label name='response'> {this.state.promptresponse} </label> */}
                </Form.Field>
                <div id="characterCount">{this.state.characterCount}</div>
                <Button type='submit' disabled={!this.state.formValid} onClick={this.handleSubmit}>Submit</Button>
                <div id="formattedResponse">
                    <Text>
                      {this.state.promptresponse.replace(/\n/g,'\n')}
                    </Text>
                </div>
                <Button type='submit' disabled={!this.state.formValid} onClick={this.callChatBison}>CallChatBison</Button>
                <div id="formattedResponse">
                    <Text>
                      {this.state.promptchatbisonresponse.replace(/\n/g,'\n')}
                    </Text>
                </div>
                <Button type='submit' disabled={!this.state.formValid} onClick={this.callTextBison}>CallTextBison</Button>
                <div id="formattedResponse">
                    <Text>
                      {this.state.prompttextbisonresponse.replace(/\n/g,'\n')}
                    </Text>
                </div>
              </Form>
      </div>

    )
}
}



