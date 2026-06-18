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

  const handleCopyCode = () => {
    if (generatedInvite) {
      navigator.clipboard.writeText(generatedInvite.code)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    }
  }

  // 系統分享：手機會跳出分享面板（LINE / WhatsApp / Messenger / 訊息…）；
  // 不支援時退回複製連結。
  const handleShare = async () => {
    if (!generatedInvite) return
    const shareData = {
      title: 'FamilyPlay 家庭邀請',
      text: `來一起照顧孩子吧！用這個邀請碼加入我的 FamilyPlay 家庭：${generatedInvite.code}`,
      url: generatedInvite.inviteLink,
    }
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        // 使用者取消分享，忽略
      }
    } else {
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
                <div className="space-y-3 rounded-2xl bg-brand-tint p-4">
                  {/* 邀請碼：大、置中 */}
                  <div className="text-center">
                    <p className="mb-1.5 text-xs text-muted">邀請碼</p>
                    <code className="block truncate rounded-xl bg-card py-3 font-mono text-2xl font-bold tracking-[0.15em] text-brand">
                      {generatedInvite.code}
                    </code>
                  </div>

                  {/* 動作：分享（系統面板→LINE/聊天室）/ 複製碼，等寬不溢出 */}
                  <div className="flex gap-2">
                    <Button size="md" icon="link" className="flex-1" onClick={handleShare}>
                      分享連結
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      icon="copy"
                      className="flex-1"
                      onClick={handleCopyCode}
                    >
                      {copySuccess ? '已複製' : '複製碼'}
                    </Button>
                  </div>

                  <p className="text-center text-xs text-brand-strong">
                    30 天內有效 · 對方可用連結或手動輸入碼加入
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
