import React from '../react'
// import React from './React'
const App1 = () => {
    const [num, setNum] = React.useState(0);

    const plus = () => {
        setNum(num + 1)
    }

    const subtra = () => {
        setNum(num - 1)
    }

    return <div>
        <button onClick={subtra}>-</button>
        <button className={num % 2 === 0 ? 'red' : 'green'}>{num}</button>
        <button onClick={plus}>+</button>
    </div>

}

React.render(<App1>123</App1>, document.getElementById('root'));
