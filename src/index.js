import React from '../react'
// import React from './React'

const Show = () => {
    React.useEffect(() => {
        console.log('show 挂载');
        return () => {
            console.log('show 卸载')
        }
    }, [])
    return <div>show</div>
}

const App1 = () => {
    const [num, setNum] = React.useState(0);
    const [update, setUpdate] = React.useState(0)
    const [show, setShow] = React.useState(true);
    React.useEffect(() => {
        console.log('mount');
    }, [num])

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
        <button onClick={() => { setUpdate(update + 1) }}>{update}</button>
        <button onClick={() => { setShow(!show) }}>show: {show}</button>
        {show ? <Show></Show> : null}
    </div>

}

React.render(<App1>123</App1>, document.getElementById('root'));
