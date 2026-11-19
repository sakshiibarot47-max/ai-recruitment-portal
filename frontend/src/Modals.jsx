import { useState } from 'react'
import { Button, Input, Modal } from './ui'
import { createInterview, updateInterview } from './api'

// Recruiter ka interview schedule / reschedule popup.
// Date: aage ke 7 din ke bade buttons (ya "pick another date"). Time: dropdown, har 30 minute ka slot.
// Backend ka error message seedha laal box me dikhta hai.

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function pad(number) {
  return String(number).padStart(2, '0')
}

function toDateString(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// "15:30" -> "3:30 PM"
function formatTime(value) {
  const [hours, minutes] = String(value).split(':').map(Number)
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  return `${hour12}:${pad(minutes)} ${hours < 12 ? 'AM' : 'PM'}`
}

// Today, Tomorrow and the next 5 days
function nextDays(count = 7) {
  const list = []

  for (let index = 0; index < count; index += 1) {
    const day = new Date()
    day.setDate(day.getDate() + index)

    list.push({
      value: toDateString(day),
      top: index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : DAYS[day.getDay()],
      bottom: `${day.getDate()} ${MONTHS[day.getMonth()]}`
    })
  }

  return list
}

// 8:00 AM to 8:00 PM, every 30 minutes
const SLOTS = (() => {
  const slots = []

  for (let minutes = 8 * 60; minutes <= 20 * 60; minutes += 30) {
    const value = `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
    slots.push({ value, label: formatTime(value) })
  }

  return slots
})()

function ErrorBox({ message }) {
  if (!message) return null
  return <div className="form-message" role="alert">{message}</div>
}

// applicant: { name }   interview: (optional) the saved interview. When given, the popup edits (reschedules) it.
export function ScheduleInterviewModal({ applicant, interview, onClose, onScheduled }) {
  const editing = Boolean(interview)
  const [savedDate, savedTime] = String(interview?.scheduled_at || '').split(' ')

  const [date, setDate] = useState(savedDate || '')
  const [time, setTime] = useState(savedTime ? savedTime.slice(0, 5) : '')
  const [mode, setMode] = useState(interview?.mode || 'Online')
  const [location, setLocation] = useState(interview?.location || '')
  const [notes, setNotes] = useState(interview?.notes || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const days = nextDays()
  const today = toDateString(new Date())
  const name = applicant?.name || 'the candidate'

  // An old time that is not in the 30-minute list (for example 12:16) stays selectable
  const slots =
    time && !SLOTS.some(slot => slot.value === time)
      ? [...SLOTS, { value: time, label: formatTime(time) }].sort((a, b) => a.value.localeCompare(b.value))
      : SLOTS

  async function submit(event) {
    event.preventDefault()
    setError('')

    if (!date) {
      setError('Choose a date for the interview.')
      return
    }

    if (!time) {
      setError('Choose a time for the interview.')
      return
    }

    const scheduledAt = `${date} ${time}`
    const timeChanged = !editing || scheduledAt !== String(interview.scheduled_at).slice(0, 16)

    if (timeChanged && new Date(`${date}T${time}`).getTime() <= Date.now()) {
      setError('Choose a time in the future.')
      return
    }

    setSaving(true)
    try {
      if (editing) {
        const data = await updateInterview(interview.id, {
          scheduledAt,
          mode,
          location: location.trim(),
          notes: notes.trim()
        })

        onScheduled(
          data?.message === 'No changes to save'
            ? 'No changes were made.'
            : `Interview updated. ${name} has been notified.`
        )
      } else {
        await createInterview({
          applicationId: applicant.application_id,
          scheduledAt,
          mode,
          location: location.trim() || undefined,
          notes: notes.trim() || undefined
        })

        onScheduled(`Interview scheduled with ${name}.`)
      }
    } catch (err) {
      // Past time, same time clash (409) ya doosra interview: backend ka message
      setError(err.message || 'Could not save the interview.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      title={`${editing ? 'Reschedule' : 'Schedule'} interview${applicant?.name ? ` with ${applicant.name}` : ''}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="interview-form" loading={saving}>
            {editing ? 'Save changes' : 'Schedule interview'}
          </Button>
        </>
      }
    >
      <form id="interview-form" className="modal-form" onSubmit={submit} noValidate>
        <div>
          <p className="dt-label" id="interview-date-label">Date *</p>
          <div className="dt-chips" role="group" aria-labelledby="interview-date-label">
            {days.map(day => (
              <button
                type="button"
                key={day.value}
                className={`dt-chip${date === day.value ? ' dt-chip-on' : ''}`}
                aria-pressed={date === day.value}
                onClick={() => setDate(day.value)}
              >
                <span>{day.top}</span>
                <small>{day.bottom}</small>
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Or pick another date"
          type="date"
          min={today}
          value={date}
          onChange={event => setDate(event.target.value)}
        />

        <Input
          label="Time *"
          as="select"
          value={time}
          onChange={event => setTime(event.target.value)}
        >
          <option value="">Select a time</option>
          {slots.map(slot => (
            <option key={slot.value} value={slot.value}>{slot.label}</option>
          ))}
        </Input>

        {date && time && (
          <p className="dt-summary">
            Interview on <b>{Number(date.slice(8, 10))} {MONTHS[Number(date.slice(5, 7)) - 1]} {date.slice(0, 4)}</b> at <b>{formatTime(time)}</b>
          </p>
        )}

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
