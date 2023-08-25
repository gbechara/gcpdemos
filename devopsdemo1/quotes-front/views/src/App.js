import logo from './logo.svg';
import './App.css';
import ListQuotes from './js/listquotes';
import InsertWriter from './js/insertwriter';
import AskLLM from './js/askllm';
import { BrowserRouter as Router, Routes, Route, NavLink, Link } from 'react-router-dom';

import React, { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import axios from 'axios';



function App() {

    const [ user, setUser ] = useState([]);
    const [ profile, setProfile ] = useState(null);

    const login = useGoogleLogin({
      //onSuccess: tokenResponse => console.log(tokenResponse), 
      onSuccess: (codeResponse) => setUser(codeResponse),
      /*onSuccess: async tokenResponse => {
        console.log(tokenResponse);
        // fetching userinfo can be done on the client or the server
        const userInfo = await axios
          .get('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          })
          .then(res => res.data);
      
        console.log(userInfo);
      },*/
      //scopes: ["email"],
      //scopes: ["openid", "https://www.googleapis.com/auth/userinfo.email",], 
      //flow: 'auth-code',
      onError: (error) => console.log('Login Failed', error),
    });
    
    useEffect(
      () => {
          if (user) {
            console.log("user in useEffect:");
            console.log(user);
            localStorage.setItem("access_token", user.access_token);
            axios
                  .get(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${user.access_token}`, {
                      headers: {
                          Authorization: `Bearer ${user.access_token}`,
                          Accept: 'application/json'
                      }
                  })
                  .then((res) => {
                      setProfile(res.data);
                      console.log('profile in useEffect:');
                      console.log(res.data);
                  })
                  .catch((err) => console.log(err));
              axios                  
                  .get(`https://oauth2.googleapis.com/tokeninfo?access_token=${user.access_token}`, {
                      headers: {
                          Authorization: `Bearer ${user.access_token}`,
                          Accept: 'application/json',
                      }
                  })
                  .then((res2) => {
                      //setProfile(res.data);
                      //console.log('profile in useEffect:');
                      console.log(res2.data);
                      console.log(btoa(res2.data));
                  })
                  .catch((err) => console.log(err));
          }
      },
      [ user ]
  );

  const logOut = () => {
    googleLogout();
    setProfile(null);
    localStorage.removeItem("access_token");
    localStorage.removeItem("credential");
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

                <div className="App">
            </div> 
            <GoogleLogin size="small" text="signin" type="icon"
                      onSuccess={credentialResponse => {
                        console.log(credentialResponse);
                        localStorage.setItem("credential", credentialResponse.credential);
                      }}
                    
                      onError={() => {
                        console.log('Login Failed');
                      }}
                    
                    />
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
