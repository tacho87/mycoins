import React from "react";
import { render } from "react-dom";
import Container from "./Container";

const App = () => (
  <div className="container-fluid">
    <Container />
  </div>
);

render(<App />, document.getElementById("root"));
