import { useEffect, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { getDeviceId } from '../lib/deviceFingerprint'

// TODO: Replace with actual API endpoint once Lambda is deployed
const API_ENDPOINT = import.meta.env.VITE_MORITZ_API_URL || 'http://localhost:3001'

async function checkDeviceApproval(deviceId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_ENDPOINT}/check-device`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId }),
    })
    const data = await response.json()
    return data.approved === true
  } catch (error) {
    console.error('Error checking device approval:', error)
    return false
  }
}

async function deductTime(deviceId: string, minutes: number): Promise<{ success: boolean; message?: string; finalTimeToday?: number }> {
  try {
    const response = await fetch(`${API_ENDPOINT}/deduct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': deviceId,
      },
      body: JSON.stringify({ minutes }),
    })
    const data = await response.json()
    return { success: data.success, message: data.message, finalTimeToday: data.finalTimeToday }
  } catch (error) {
    console.error('Error deducting time:', error)
    return { success: false, message: 'Failed to deduct time' }
  }
}

export default function MoritzTools() {
  const navigate = useNavigate()
  const search = useSearch({ from: '/moritz-tools' })
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [isApproved, setIsApproved] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(true)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [isDeducting, setIsDeducting] = useState(false)

  useEffect(() => {
    const code = (search as { code?: string }).code
    if (code !== 'anerinack') {
      navigate({ to: '/' })
      return
    }

    // Get device ID and check approval
    async function initDevice() {
      const id = await getDeviceId()
      setDeviceId(id)

      const approved = await checkDeviceApproval(id)
      setIsApproved(approved)
      setIsChecking(false)
    }

    initDevice()
  }, [search, navigate])

  const code = (search as { code?: string }).code
  if (code !== 'anerinack') {
    return null
  }

  if (isChecking) {
    return (
      <>
        <meta name="robots" content="noindex, nofollow" />
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-slate-800 rounded-lg p-6">
            <p className="text-slate-300">Verifying device...</p>
          </div>
        </div>
      </>
    )
  }

  const handleDeduct = async (minutes: number) => {
    if (!deviceId || isDeducting) return

    setIsDeducting(true)
    setStatusMessage('Processing...')

    const result = await deductTime(deviceId, minutes)

    if (result.success) {
      setStatusMessage(`✅ ${result.message} Final time today: ${result.finalTimeToday} minutes`)
    } else {
      setStatusMessage(`❌ ${result.message || 'Failed to deduct time'}`)
    }

    setIsDeducting(false)

    // Clear message after 5 seconds
    setTimeout(() => setStatusMessage(null), 5000)
  }

  if (!isApproved) {
    return (
      <>
        <meta name="robots" content="noindex, nofollow" />
        <div className="max-w-4xl mx-auto p-6">
          <h1 className="text-3xl font-bold text-white mb-6">Device Not Approved</h1>
          <div className="bg-slate-800 rounded-lg p-6">
            <p className="text-slate-300 mb-4">
              This device is not authorized to access Moritz Tools.
            </p>
            <div className="bg-slate-900 rounded p-4 mb-4">
              <p className="text-slate-400 text-sm mb-2">Device ID:</p>
              <code className="text-green-400 font-mono text-sm break-all">{deviceId}</code>
            </div>
            <p className="text-slate-400 text-sm">
              Ask your administrator to add this device ID to the approved devices list in AWS DynamoDB.
            </p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <meta name="robots" content="noindex, nofollow" />
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-white mb-6">Moritz Tools</h1>
        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Nintendo Switch Parental Controls Time Management
          </h2>
          <p className="text-slate-300 mb-4">
            This page provides access to the Nintendo Switch parental controls time management system.
          </p>
          <div className="text-slate-400 text-sm">
            <p>Status: In Development</p>
            <p className="mt-2">
              Device ID: <code className="bg-slate-900 px-2 py-1 rounded text-xs">{deviceId?.substring(0, 16)}...</code>
            </p>
          </div>
        </div>

        {/* Time Deduction Controls */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Deduct Time</h3>
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => handleDeduct(5)}
              disabled={isDeducting}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded transition"
            >
              -5 min
            </button>
            <button
              onClick={() => handleDeduct(10)}
              disabled={isDeducting}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded transition"
            >
              -10 min
            </button>
            <button
              onClick={() => handleDeduct(15)}
              disabled={isDeducting}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded transition"
            >
              -15 min
            </button>
          </div>
          {statusMessage && (
            <p className="text-slate-300 text-sm mt-4 p-3 bg-slate-900 rounded">
              {statusMessage}
            </p>
          )}
        </div>
      </div>
    </>
  )
}
