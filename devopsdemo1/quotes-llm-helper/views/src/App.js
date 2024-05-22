import logo from './logo.svg';
import './App.css';
import AskLLM from './js/askllm';
import { BrowserRouter as Router, Routes, Route, NavLink, Link } from 'react-router-dom';

import React, { useState, useEffect } from 'react';
import { useAuth0 } from "@auth0/auth0-react";

import axios from 'axios';



function App() {

  
    function refresh() {
      window.location.reload();
    }

  return (
 /*   <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>*/
      <Router>
        <div className="container-fluid">
          <div className="topnav" id="myTopnav">
                <NavLink to='/' size='0'>AskLLM</NavLink>
                <a onClick={refresh}>Refresh </a>      
              
          </div>
          <div className="App">
         </div> 
         <div>       
              <Routes>
                <Route path='/' element={<AskLLM/>} />             
              </Routes>
         </div>
        </div>  
      </Router>
  );
}



//ReactDOM.render(<App />, document.getElementById('monapp'));


export default App;
