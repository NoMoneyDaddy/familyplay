'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useHouseholdStore } from '@/lib/stores/useHouseholdStore'

interface HouseholdMember {
  id: string
  displayName: string
  role: 'owner' | 'caregiver' | 'viewer'
  nickname?: string
  joinedAt: string
}

interface GeneratedInvite {
  code: string
  inviteLink: string
}

export default function InvitePage() {
  const router = useRouter()
  const { householdId, setHouseholdId, setMembers, setRole } = useHouseholdStore()

  const [members, setLocalMembers] = useState<HouseholdMember[]>([])
  const [generatedInvite, setGeneratedInvite] = useState<GeneratedInvite | null>(null)
  const [selectedRole, setSelectedRole] = useState<'caregiver' | 'viewer'>('caregiver')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [userRole, setUserRole] = useState<'owner' | 'caregiver' | 'viewer' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadHouseholdData = async () => {
      try {
        setLoading(true)

        // Get user's household and role from /api/profile extended endpoint
        const profileRes = await fetch('/api/profile')
        const profile = await profileRes.json()

        if (!profile.householdId) {
          router.push('/select')
          return
        }

        setHouseholdId(profile.householdId)
        setRole(profile.role)
        setUserRole(profile.role)

        // Load household members
        const membersRes = await fetch(`/api/households/members?householdId=${profile.householdId}`)
        if (membersRes.ok) {
          const data = await membersRes.json()
          setLocalMembers(data)
          setMembers(data)
        }
      } catch (error) {
        console.error('Failed to load household data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadHouseholdData()
  }, [setHouseholdId, setRole, setMembers, router])

  const handleGenerateInvite = async () => {
    if (!householdId) return

    try {
      setGenerating(true)
      const res = await fetch('/api/households/invites/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdId,
          role: selectedRole,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setGeneratedInvite(data)
      } else {
        setError(data.error || '生成邀請碼失敗，請重試')
      }
    } catch (error) {
      console.error('Failed to generate invite:', error)
      setError('生成邀請碼失敗，請重試')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopyLink = () => {
    if (generatedInvite) {
      navigator.clipboard.writeText(generatedInvite.inviteLink)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[--color-bg] to-white px-5 py-8">
      <div className="mx-auto max-w-[480px] space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-[--color-muted] hover:text-[--color-text]"
          >
            ← 返回
          </button>
          <h1 className="text-3xl font-bold text-[--color-brand]">邀請家庭成員</h1>
          <p className="text-sm text-[--color-muted]">分享邀請碼，讓其他家長加入陪伴</p>
        </div>

        {/* live region 常駐 DOM */}
        <div
          role="alert"
          className={error ? 'rounded-lg bg-red-50 p-3 text-sm text-red-700' : 'sr-only'}
        >
          {error}
        </div>

        {loading ? (
          <div className="text-center text-[--color-muted]" role="status">
            加載中...
          </div>
        ) : (
          <>
            {/* Generate Invite Section */}
            {userRole === 'owner' || userRole === 'caregiver' ? (
              <div className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
                <h2 className="font-semibold text-[--color-text]">生成邀請碼</h2>

                {/* Role Selection */}
                <div className="space-y-2">
                  <label htmlFor="role" className="block text-sm font-medium text-[--color-text]">
                    角色
                  </label>
                  <select
                    id="role"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as 'caregiver' | 'viewer')}
                    className="w-full rounded-lg border border-[--color-border] px-3 py-2 text-[--color-text]"
                  >
                    <option value="caregiver">照顧者 (可以記錄和建議)</option>
                    <option value="viewer">檢視者 (只可查看)</option>
                  </select>
                </div>

                {/* Generate Button */}
                <button
                  type="button"
                  onClick={handleGenerateInvite}
                  disabled={generating}
                  className="w-full rounded-lg bg-[--color-brand] px-4 py-3 text-white font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {generating ? '生成中...' : '生成邀請碼'}
                </button>

                {/* Generated Invite Display */}
                {generatedInvite && (
                  <div className="space-y-3 rounded-lg bg-blue-50 p-4">
                    <div>
                      <p className="text-xs text-[--color-muted] mb-1">邀請碼</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 rounded bg-white px-3 py-2 font-mono text-lg font-bold text-[--color-brand]">
                          {generatedInvite.code}
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(generatedInvite.code)
                            setCopySuccess(true)
                            setTimeout(() => setCopySuccess(false), 2000)
                          }}
                          className="rounded bg-[--color-brand] px-3 py-2 text-xs text-white hover:opacity-90"
                        >
                          複製
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-[--color-muted] mb-1">完整邀請連結</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={generatedInvite.inviteLink}
                          className="flex-1 rounded bg-white px-3 py-2 text-xs text-[--color-text]"
                        />
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className="rounded bg-[--color-brand] px-3 py-2 text-xs text-white hover:opacity-90"
                        >
                          {copySuccess ? '已複製' : '複製'}
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-blue-600">
                      💡 30 天內有效。家長可以透過連結或手動輸入碼加入。
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-700">
                <p className="font-semibold">權限不足</p>
                <p className="mt-1 text-xs">只有家庭擁有者和照顧者才能邀請成員。</p>
              </div>
            )}

            {/* Household Members List */}
            <div className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
              <h2 className="font-semibold text-[--color-text]">家庭成員 ({members.length})</h2>

              {members.length === 0 ? (
                <p className="text-sm text-[--color-muted]">暫無其他成員</p>
              ) : (
                <div className="space-y-2">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-lg bg-[--color-bg] p-3"
                    >
                      <div>
                        <p className="font-medium text-[--color-text]">{member.displayName}</p>
                        <p className="text-xs text-[--color-muted]">
                          {member.role === 'owner' && '家庭擁有者'}
                          {member.role === 'caregiver' && '照顧者'}
                          {member.role === 'viewer' && '檢視者'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-[--color-muted]">
                          加入於 {new Date(member.joinedAt).toLocaleDateString('zh-TW')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Info Card */}
            <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
              <p className="font-semibold">💡 角色說明</p>
              <ul className="mt-2 space-y-1 text-xs">
                <li>
                  <strong>家庭擁有者：</strong>管理家庭、邀請成員、刪除成員
                </li>
                <li>
                  <strong>照顧者：</strong>查看孩子、記錄陪伴、建議活動
                </li>
                <li>
                  <strong>檢視者：</strong>只能查看孩子資訊和陪伴紀錄
                </li>
              </ul>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
