import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { Route, Switch } from "react-router-dom";
import SignupFormPage from "./components/SignupFormPage";
import LoginFormPage from "./components/LoginFormPage";
import * as sessionActions from "./store/session";
import { MainPage } from "./components/MainPage";
import { ThreadProvider } from "./context/ThreadContext";

function App() {
  const dispatch = useDispatch();
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    dispatch(sessionActions.authenticate())
      .then(() => setIsAuthed(true));
  }, [dispatch]);


  return (
    <>
      {isAuthed && (
        <>
          <Switch>
            <Route exact path="/">
              <ThreadProvider>
                <MainPage />
              </ThreadProvider>
            </Route>
            <Route exact path="/login">
              <LoginFormPage />
            </Route>
            <Route exact path="/signup">
              <SignupFormPage />
            </Route>
          </Switch>
        </>
      )}
    </>
  );
}

export default App;
