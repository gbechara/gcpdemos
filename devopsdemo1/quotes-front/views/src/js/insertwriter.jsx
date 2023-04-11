import React, { useState } from 'react';
import { Button, Checkbox, Form } from 'semantic-ui-react'
import { Link } from 'react-router-dom';
import Table from 'react-bootstrap/Table';



export default function InsertWriter() {
  return (<NewWriter />);
}

class NewWriter extends React.Component {



    constructor(props) {
      super(props);
      this.state = {
        writer: '',
        color: '',
      }
  
      this.handleChange = this.handleChange.bind(this);
      this.handleSubmit = this.handleSubmit.bind(this);
    }


    
  refresh() {
    window.location.reload();
  }
  

  handleChange(event) {
//    this.setState({writer: event.target.writer});
//    this.setState({color: event.target.color});
    const target = event.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;

    this.setState({
      [name]: value
    });
  }

  handleSubmit(event) {
 //   alert('Submitted: Writer :' + this.state.writer +' Color :'+this.state.color);
    window.$.get(`https://${process.env.REACT_APP_BACK_URL}/api/writers/insertwriter/${encodeURIComponent(this.state.writer)}/${encodeURIComponent(this.state.color)}`);
    window.location.assign("/");
  }



  render() {


    return (
      <div className="container">
          <div className="col-xs-8 col-xs-offset-2 jumbotron">
            <div className="col-lg-12">

              <Table striped bordered responsive hover size="sm">
                <tbody>
                  <tr>
                    <td>
                      <Link to='/'>
                        <a>List Quotes</a>
                      </Link>
                    </td>
                    <td>
                      <a onClick={this.refresh}>Refresh </a>                 
                    </td>
                    <td>
                      <a onClick={this.logout}>Log out</a>
                    </td>  
                  </tr> 
                </tbody> 
              </Table>  

              <h3>Create new writer</h3>

              <Form className="create-form" onSubmit={this.handleSubmit} size='huge'>
     
                  <Form.Field required='true' widths='11'>
                      <label>Writer </label>
                        <input name='writer' placeholder='Author Name' value={this.state.writer} onChange={this.handleChange}/>
                      
                  </Form.Field>
                  <Form.Field required='true' widths='11'>
                      <label size='7'>Color  </label>
                        <input name='color' placeholder='#4285F4' value={this.state.color} onChange={this.handleChange}/>
                      
                  </Form.Field>
                <Button type='submit'>Submit</Button>
              </Form>
          </div>
        </div>
      </div>

    )
}
}

