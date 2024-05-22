import { useEffect, useState } from 'react'
import supabase from './lib/supabase'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'

export default function App() {
  const { data: db } = useQuery({
    queryKey: ['test'],
    queryFn: async () => {
      const { data, error } = await supabase.from('test').select('*')
      if (error) throw new Error(error.message)
      return data
    },
  })
  const { data: oldDiv } = useQuery({
    queryKey: ['div'],
    queryFn: async () => {
      const { data, error } = await supabase.from('div').select('*').single()
      if (error) throw new Error(error.message)
      return data
    },
  })

  const [data, setData] = useState<
    {
      created_at: string
      id: number
      message: string | null
    }[]
  >([])
  useEffect(() => {
    if (!db) return
    setData(db)
  }, [db])

  useEffect(() => {
    const subscription = supabase
      .channel('public:test')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'test' }, payload => {
        console.log('Change received!', payload)
        switch (payload.eventType) {
          case 'INSERT':
            setData(prev => [
              ...prev,
              payload.new as {
                created_at: string
                id: number
                message: string | null
              },
            ])
            break
          case 'UPDATE':
            setData(prev =>
              prev.map(c =>
                c.id === payload.new.id
                  ? (payload.new as {
                      created_at: string
                      id: number
                      message: string | null
                    })
                  : c
              )
            )
            break
          case 'DELETE':
            setData(prev => prev.filter(row => row.id !== payload.old.id))
            break
          default:
            break
        }
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const [div, setDiv] = useState({ color: 'red', centered: false, created_at: '', id: 0, rounded: false })

  useEffect(() => {
    if (!oldDiv) return
    setDiv(oldDiv as { color: string; centered: boolean; created_at: string; id: number; rounded: boolean })
  }, [oldDiv])

  useEffect(() => {
    const subscription = supabase
      .channel('public:div')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'div' }, payload => {
        if (payload.new) setDiv(payload.new as { color: string; centered: boolean; created_at: string; id: number; rounded: boolean })
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <div className='h-screen flex flex-col items-center p-10'>
      {data.map(row => (
        <div className='text-3xl' key={row.id}>
          {row.message}
        </div>
      ))}
      <div className={clsx('mt-32 w-full flex justify-start', div.centered && 'justify-center')}>
        <div className={clsx('w-32 h-32', div.rounded && 'rounded-full')} style={{ backgroundColor: div.color }}></div>
      </div>
    </div>
  )
}
