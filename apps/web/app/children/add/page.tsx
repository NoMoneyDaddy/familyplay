'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ChildForm } from '@/app/components/child-form'
import { Callout, Icon, LinkButton, PageHeader, PageShell } from '@/app/components/ui'

export default function AddChildPage() {
  const router = useRouter()
  const [added, setAdded] = useState<{ id: number; nickname: string }[]>([])
  // formKey 同時用於：重新掛載表單以清空狀態 + 作為已新增清單的穩定 key 來源
  const [formKey, setFormKey] = useState(0)

  const handleSuccess = (child?: { nickname: string }) => {
    if (child?.nickname) {
      setAdded((prev) => [...prev, { id: formKey, nickname: child.nickname }])
    }
    setFormKey((k) => k + 1)
  }

  return (
    <PageShell>
      <PageHeader
        title="新增孩子"
        subtitle="一次可以新增多個孩子，之後也能隨時調整"
        backHref="/children"
      />

      {added.length > 0 && (
        <Callout tone="success" title={`已新增 ${added.length} 個孩子`}>
          <ul className="flex flex-wrap gap-2 pt-1">
            {added.map((c) => (
              <li
                key={c.id}
                className="inline-flex items-center gap-1 rounded-full bg-card px-3 py-1 text-xs font-medium text-text"
              >
                <Icon name="child" className="h-[14px] w-[14px] text-brand" />
                {c.nickname}
              </li>
            ))}
          </ul>
        </Callout>
      )}

      <ChildForm
        key={formKey}
        onSuccess={handleSuccess}
        submitLabel={added.length > 0 ? '再新增一個孩子' : '建立孩子'}
      />

      {added.length > 0 && (
        <LinkButton href="/children" variant="secondary" size="lg" icon="check">
          完成，回到孩子列表
        </LinkButton>
      )}

      {/* Feature 2 的入口：邀請次要成員一起共同照顧/查看 */}
      <Callout tone="tip" title="想和家人一起照顧？">
        <p>
          發送邀請連結或邀請碼，讓另一半、長輩或保母加入同一個家庭，共同查看孩子的資料與陪伴紀錄。
        </p>
        <button
          type="button"
          onClick={() => router.push('/settings/invite')}
          className="mt-2 inline-flex items-center gap-1 font-semibold text-brand hover:text-brand-strong"
        >
          邀請家人
          <Icon name="chevronRight" className="h-[14px] w-[14px]" />
        </button>
      </Callout>
    </PageShell>
  )
}
