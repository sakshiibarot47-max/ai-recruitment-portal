import { useState } from 'react'
import { Button, Input, Modal } from './ui'
import { createInterview } from './api'

// Recruiter ka interview schedule popup. Backend ka error message seedha laal box me dikhta hai.

function ErrorBox({ message }) {
  if (!message) return null
  return <div className="form-message" role="alert">{message}</div>
}

function nowForInput() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

export function ScheduleInterviewModal({ applicant, onClose, onScheduled }) {
  const [when, setWhen] = useState('')
  const [mode, setMode] = useState('Online')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setError('')

    if (!when) {
      setError('Choose a date and time for the interview.')
      return
    }

    setSaving(true)
    try {
      await createInterview({
        applicationId: applicant.application_id,
        // datetime-local deta hai "2026-11-20T14:30", backend ko "2026-11-20 14:30" chahiye
        scheduledAt: when.replace('T', ' '),
        mode,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined
      })
      onScheduled(`Interview scheduled with ${applicant.name || 'the candidate'}.`)
    } catch (err) {
      // Past time, same time clash (409) ya doosra interview: backend ka message
      setError(err.message || 'Could not schedule the interview.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      title={`Schedule interview${applicant.name ? ` with ${applicant.name}` : ''}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="interview-form" loading={saving}>Schedule interview</Button>
        </>
      }
    >
      <form id="interview-form" className="modal-form" onSubmit={submit} noValidate>
        <Input
          label="Date and time *"
          type="datetime-local"
          min={nowForInput()}
          value={when}
          onChange={event => setWhen(event.target.value)}
        />
        <Input label="Mode" as="select" value={mode} onChange={event => setMode(event.target.value)}>
          <option>Online</option>
          <option>In-person</option>
        </Input>
        <Input
          label={mode === 'Online' ? 'Meeting link' : 'Address'}
          value={location}
          onChange={event => setLocation(event.target.value)}
          placeholder={mode === 'Online' ? 'https://meet.google.com/...' : 'Office address'}
          maxLength={300}
        />
        <Input
          label="Notes for the candidate"
          as="textarea"
          rows={3}
          value={notes}
          onChange={event => setNotes(event.target.value)}
          maxLength={500}
        />
        <ErrorBox message={error} />
      </form>
    </Modal>
  )
}
