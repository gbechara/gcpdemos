import logo from './logo.svg';
import './App.css';
import ListQuotes from './js/listquotes';
import InsertWriter from './js/insertwriter';
import AskLLM from './js/askllm';
import { BrowserRouter as Router, Routes, Route, NavLink, Link } from 'react-router-dom';

import React, { useState, useEffect } from 'react';
import { useAuth0 } from "@auth0/auth0-react";

import axios from 'axios';



function App() {

  
  const { getAccessTokenSilently, isAuthenticated, error, user, loginWithPopup, logout, IdToken } = useAuth0();
  //const [userMetadata, setUserMetadata] = useState(null);
  //const [ profile, setProfile ] = useState(null);

  useEffect(() => {
    const getUserMetadata = async () => {
      
      const domain = "dev-5afb7uqxrrjxjcu2.us.auth0.com";
      try {
        const accessToken = await getAccessTokenSilently({
          authorizationParams: {
            audience: `https://${domain}/api/v2/`,
            //scope: "read:current_user",
          },
        });
  
        /*
        const userDetailsByIdUrl = `https://${domain}/api/v2/users/${user.sub}`;
        const metadataResponse = await fetch(userDetailsByIdUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });*/
  
        //const { user_metadata } = await metadataResponse.json();
        //setUserMetadata(user_metadata);

        console.log(accessToken);
        console.log(user);
        //console.log(metadataResponse);
        //console.log(user_metadata);

        localStorage.setItem("credential", accessToken)

      } catch (e) {
        console.log(e.message);
      }
    };
  
    getUserMetadata();
  }, [getAccessTokenSilently, user?.sub]);

  function logIn() {
    loginWithPopup()
  };
 
  function logOut() {
    localStorage.removeItem("credential");
    logout({ logoutParams: { returnTo: window.location.origin } })
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
                <div className="login-container">
                  {user ?( 
                    <div>
                      <p >{user.email}</p> 
                      <button onClick={logOut}>Log out</button> 
                    </div>
                  ):(
                    <div>
                      <p></p> 
                      <button onClick={logIn}>Log In</button>
                    </div>
                  )}
                </div>
                </div>
                <div className="App">
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
