import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";

import { Button, Checkbox, Form } from 'semantic-ui-react'
import { Link } from 'react-router-dom';
import Table from 'react-bootstrap/Table';
import { FormErrors } from './FormErrors';
import axios from 'axios';
import { View, StyleSheet, Text } from 'react-native';
import { ReactTableScroll } from 'react-table-scroll';



export default function InsertWriter() {
  return (<NewWriter />);
}

class NewWriter extends React.Component {

    constructor(props) {
      super(props);
      this.state = {
        writer: '',
        color: '',
        writerValid: false,
        colorValid: false,
        formErrors: {writer: '', color: ''},
        formValid: false,
        insertWriterResponse :'',
        writers: [],
      }
  
      this.handleChange = this.handleChange.bind(this);
      this.handleSubmit = this.handleSubmit.bind(this);

      this.serverRequest = this.serverRequest.bind(this);
    }


    
  refresh() {
    window.location.reload();
  }
  

  serverRequest() {
    axios.get(`https://${process.env.REACT_APP_BACK_URL}/api/writers`)
    .then(res => {
      this.setState({
        writers: res.data
      });
    });  
  }

  componentDidMount() {
    this.serverRequest();
  }

  handleChange(event) {
//    this.setState({writer: event.target.writer});
//    this.setState({color: event.target.color});
    const target = event.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;
  
    this.setState(
      {[name]: value, }, () => { this.validateField(name, value)});
    };
  
  
  validateField(fieldName, value) {
    let fieldValidationErrors = this.state.formErrors;
    let writerValid = this.state.writerValid;
    let colorValid = this.state.colorValid;
  
    switch(fieldName) {
      case 'writer':
        //writerValid = value.match(/^([\w.%+-]+)@([\w-]+\.)+([\w]{2,})$/i);
        writerValid = value.match(/^\S+\s\S+$/i);
        fieldValidationErrors.writerValid = writerValid ? '' : ' a writer is more than one word (first and last name) !';
        break;
      case 'color':
        colorValid = value.length >= 7;
        fieldValidationErrors.colorValid = colorValid ? '': ' a color is should have 7 characters';
        break;
      default:
        break;
    }
    this.setState({formErrors: fieldValidationErrors,
                    writerValid: writerValid,
                    colorValid: colorValid
                  }, this.validateForm);
  }


  validateForm() {
    this.setState({formValid: this.state.writerValid && this.state.colorValid});
  }
  
  errorClass(error) {
    return(error.length === 0 ? '' : 'has-error');
  }

  handleSubmit(event) {
 //   alert('Submitted: Writer :' + this.state.writer +' Color :'+this.state.color);
 //   window.$.get(`https://${process.env.REACT_APP_BACK_URL}/api/writers/insertwriter/${encodeURIComponent(this.state.writer)}/${encodeURIComponent(this.state.color)}`);
    
/*    axios.get(`https://${process.env.REACT_APP_BACK_URL}/api/writers/insertwriter/${encodeURIComponent(this.state.writer)}/${encodeURIComponent(this.state.color)}`,
    {
      headers: {
        'Authorization': localStorage.getItem("credential")&& localStorage.getItem("credential")!='undefined'? `Bearer ${localStorage.getItem("credential")}`:''
      }

    })*/
    axios.get(`https://${process.env.REACT_APP_BACK_URL}/api/writers/insertwriter/${encodeURIComponent(this.state.writer)}/${encodeURIComponent(this.state.color)}`,
    {
      headers: {
        //'Authorization': localStorage.getItem("apiAccessToken")&& localStorage.getItem("apiAccessToken")!='undefined'? `Bearer ${localStorage.getItem("apiAccessToken")}`:''
        'Authorization': localStorage.getItem("credential")&& localStorage.getItem("credential")!='undefined'? `Bearer ${localStorage.getItem("credential")}`:''
      }

    })

    .then(res => {    
        
          this.setState({
            insertWriterResponse: JSON.stringify(res.data) 
          });
          this.serverRequest();

        }).catch((err) => 
        {    
          console.log(err)
          this.setState({
            insertWriterResponse: JSON.stringify(err.response) +"\n"+ JSON.stringify(err)
          });
        })

  }



  render() {


    return (
      <div>
 
 
              <h3>Create new writer</h3>
              
              <Form className="create-form" onSubmit={this.handleSubmit}>
                <div className="panel panel-default">
                  <FormErrors formErrors={this.state.formErrors} />
                </div>
                <Form.Field >
                    <label >Writer </label> <br/>
                    <input name='writer' placeholder='FirstName LastName' value={this.state.writer} onChange={this.handleChange} style={{width: '350px'}}/>
                </Form.Field>
                <Form.Field >
                    <label >Color  </label><br/>
                    <select name='color' placeholder='#4285F4' value={this.state.color} onChange={this.handleChange} style={{width: '350px'}}>
                      <option value="">--Please choose a color---</option>
                      <option value="#4285F4">Blue</option>
                      <option value="#DB4437">Red</option>
                      <option value="#F4B400">Yellow</option>
                      <option value="#0F9D58">Green</option>
                      <option value="#545454">Grey</option>
                    </select>
                </Form.Field><br/>
                <Form.Button type='submit' disabled={!this.state.formValid}>Submit</Form.Button>
                <div id="formattedResponse">
                    <Text>
                      {this.state.insertWriterResponse.replace(/\n/g,'\n')}
                    </Text>
                </div>
              </Form>
              <p/>
 
              <ReactTableScroll >
                <table style={{width: '350px'}}  className="table table-bordered table-hover table-striped mb-0">
                  <thead>
                      <tr>
                          <td>ID</td>
                          <td>Writer</td>
                          <td>Color</td>
                      </tr>
                  </thead>
                  <tbody> 
                    {this.state.writers.map((item, index) => (
                          <tr key={index}>
                              <td>{index}</td>
                              <td>{item.writer}</td>
                              <td>{item.color}</td>
                          </tr>
                      ))}
                  </tbody>
                </table>
              </ReactTableScroll>
              
      </div>

    )
}
}

