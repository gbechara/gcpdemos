import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

import { Auth0Provider } from '@auth0/auth0-react';

/*(() => {
  console.log('webpack worked')
})*/

const root = ReactDOM.createRoot(document.getElementById('monapp'));

root.render(
  //<React.StrictMode>
    <Auth0Provider 
        domain='dev-5afb7uqxrrjxjcu2.us.auth0.com'
        clientId='weNB7Bcw9g1jhHYP5P9o5wLXa5ZkcbG6'
        authorizationParams={{
          //redirect_uri: window.location.origin,
          //audience: "https://app.dev.gabrielbechara.com/api/",
          audience: "https://dev-5afb7uqxrrjxjcu2.us.auth0.com/api/v2/",
          scope: "openid email profile read:current_user update:current_user_metadata"
        }}>
      <App />
    </Auth0Provider>
  //</React.StrictMode>
);


// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
