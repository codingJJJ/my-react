import React from '../react'
const App = () => { return <div>333</div> }
console.log(<App>321</App>);
console.log(<div>123</div>);
console.log(<App><div>123</div></App>);
console.log(App());