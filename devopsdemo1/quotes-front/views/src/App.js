import logo from './logo.svg';
import './App.css';
import ListQuotes from './js/listquotes';
import InsertWriter from './js/insertwriter';
import AskLLM from './js/askllm';
import { BrowserRouter as Router, Routes, Route, NavLink, Link } from 'react-router-dom';

import React, { useState, useEffect } from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import axios from 'axios';



function App() {

    const [ user, setUser ] = useState([]);
    const [ profile, setProfile ] = useState(null);
    
    const login = useGoogleLogin({
      onSuccess: tokenResponse => console.log(tokenResponse), 
      onSuccess: (codeResponse) => setUser(codeResponse),
      scopes: ["email"],
      //flow: 'auth-code',
      onError: (error) => console.log('Login Failed', error),
    });
    
    useEffect(
      () => {
          if (user) {
              axios
                  .get(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${user.access_token}`, {
                      headers: {
                          Authorization: `Bearer ${user.access_token}`,
                          Accept: 'application/json'
                      }
                  })
                  .then((res) => {
                      setProfile(res.data);
                      console.log('profile'+res.data);
                  })
                  .catch((err) => console.log(err));
          }
      },
      [ user ]
  );

  const logOut = () => {
    googleLogout();
    setProfile(null);
  };
    
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
                <NavLink to='/' size='0'>List Quotes</NavLink>
                <NavLink to='/insertwriter' size='0'>Insert Writer</NavLink>
                <NavLink to='/askllm' size='0'>Ask LLM</NavLink>                
                <a onClick={refresh}>Refresh </a>
                
                <div class="login-container">
                  {profile ?( 
                    <div>
                      <p >{profile.email}</p> 
                      <button onClick={logOut}>Log out</button> 
                    </div>
                  ):(
                    <div>
                      <p></p> 
                      <button onClick={()=>login()}>Log In</button>
                    </div>
                  )}
                </div>

            </div> 
            <div>       
              <Routes>
                <Route path='/insertwriter' element={<InsertWriter/>} />
                <Route path='/askllm' element={<AskLLM/>} />
                <Route path='/' element={<ListQuotes/>} />             
              </Routes>
          </div>
        </div>  
      </Router>
  );
}



//ReactDOM.render(<App />, document.getElementById('monapp'));


export default App;
