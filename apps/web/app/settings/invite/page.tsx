'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Button,
  Callout,
  Card,
  ErrorAlert,
  Field,
  Icon,
  PageHeader,
  PageShell,
  Select,
} from '@/app/components/ui'
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

const ROLE_LABEL: Record<HouseholdMember['role'], string> = {
  owner: '家庭擁有者',
  caregiver: '照顧者',
  viewer: '檢視者',
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
      setError(null)
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
    <PageShell>
      <PageHeader
        title="邀請家庭成員"
        subtitle="分享邀請碼，讓其他家長加入陪伴"
        backHref="/settings"
      />

      <ErrorAlert message={error} />

      {loading ? (
        <div className="text-center text-muted" role="status">
          加載中...
        </div>
      ) : (
        <>
          {/* Generate Invite Section */}
          {userRole === 'owner' || userRole === 'caregiver' ? (
            <Card className="space-y-4">
              <h2 className="font-semibold text-text">生成邀請碼</h2>

              {/* Role Selection */}
              <Field label="角色" htmlFor="role">
                <Select
                  id="role"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as 'caregiver' | 'viewer')}
                >
                  <option value="caregiver">照顧者 (可以記錄和建議)</option>
                  <option value="viewer">檢視者 (只可查看)</option>
                </Select>
              </Field>

              {/* Generate Button */}
              <Button
                size="lg"
                icon="refresh"
                loading={generating}
                disabled={generating}
                onClick={handleGenerateInvite}
              >
                生成邀請碼
              </Button>

              {/* Generated Invite Display */}
              {generatedInvite && (
                <div className="space-y-3 rounded-md bg-brand-tint p-4">
                  <div>
                    <p className="mb-1 text-xs text-muted">邀請碼</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded bg-card px-3 py-2 font-mono text-lg font-bold text-brand">
                        {generatedInvite.code}
                      </code>
                      <Button
                        variant="secondary"
                        size="md"
                        icon="copy"
                        onClick={() => {
                          navigator.clipboard.writeText(generatedInvite.code)
                          setCopySuccess(true)
                          setTimeout(() => setCopySuccess(false), 2000)
                        }}
                      >
                        複製
                      </Button>
                    </div>
                  </div>

                  <div>
                    <p className="mb-1 text-xs text-muted">完整邀請連結</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={generatedInvite.inviteLink}
                        className="flex-1 rounded border border-border bg-card px-3 py-2 text-xs text-text"
                      />
                      <Button variant="secondary" size="md" icon="copy" onClick={handleCopyLink}>
                        {copySuccess ? '已複製' : '複製'}
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-brand-strong">
                    30 天內有效。家長可以透過連結或手動輸入碼加入。
                  </p>
                </div>
              )}
            </Card>
          ) : (
            <Callout tone="warning" title="權限不足">
              只有家庭擁有者和照顧者才能邀請成員。
            </Callout>
          )}

          {/* Household Members List */}
          <Card className="space-y-4">
            <h2 className="font-semibold text-text">家庭成員 ({members.length})</h2>

            {members.length === 0 ? (
              <p className="text-sm text-muted">暫無其他成員</p>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-bg p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Icon name="user" className="h-[20px] w-[20px] text-brand" />
                      <div>
                        <p className="font-medium text-text">{member.displayName}</p>
                        <p className="text-xs text-muted">{ROLE_LABEL[member.role]}</p>
                      </div>
                    </div>
                    <p className="text-right text-xs text-muted">
                      加入於 {new Date(member.joinedAt).toLocaleDateString('zh-TW')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Info Card */}
          <Callout tone="info" title="角色說明">
            <ul className="mt-1 space-y-1">
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
          </Callout>
        </>
      )}
    </PageShell>
  )
}
