import { useState, useEffect, useEffectEvent } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import api from './api'
import './App.css'

function App () {
  const [tasks, setTasks] = useState([])
  useEffect(() => {
    api
      .get('/tasks')
      .then(res => setTasks(res.data))
      .catch(err => console.log(err))
  }, [])

  return (
    <>
      <div>
        <h1>Lista de Tareas</h1>
        <ul>
          {tasks.map(t => (
            <li key={t._id}>
              {t.title}
              <p>{t._id}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className='card'></div>
    </>
  )
}

export default App
