"use client"
import { Archive, Mail, Reply } from "rockin/lucide"
import { Tabs, TabsList, TabsPanel, TabsTab, TabsIcon } from "rockin/ui"

const sections = Array.from({ length: 14 }, (_, i) => `Section ${i + 1}`)
const variants = ["default", "outline", "secondary", "ghost", "destructive", "link"] as const
const sizes = ["xs", "sm", "default", "lg"] as const

export default function Page() {
  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-10 p-6">
      {variants.map((variant) =>
        sizes.map((size) => (
          <Tabs key={`${variant}-${size}`} variant={variant} size={size} defaultValue="week">
            <Tabs.List aria-label={`${variant} ${size}`}>
              <Tabs.Tab value="day">
                <Tabs.Icon>
                  <Mail />
                </Tabs.Icon>
                Day
              </Tabs.Tab>
              <Tabs.Tab value="week">Week</Tabs.Tab>
              <Tabs.Tab value="month">Month</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="day">
              {variant} / {size}: day
            </Tabs.Panel>
            <Tabs.Panel value="week">
              {variant} / {size}: week
            </Tabs.Panel>
            <Tabs.Panel value="month">
              {variant} / {size}: month
            </Tabs.Panel>
          </Tabs>
        ))
      )}

      <Tabs variant="link" orientation="vertical" defaultValue="security">
        <Tabs.List aria-label="Underline vertical">
          <Tabs.Tab value="general">General</Tabs.Tab>
          <Tabs.Tab value="security">Security</Tabs.Tab>
          <Tabs.Tab value="billing">Billing</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="general">General settings.</Tabs.Panel>
        <Tabs.Panel value="security">Security settings.</Tabs.Panel>
        <Tabs.Panel value="billing">Billing settings.</Tabs.Panel>
      </Tabs>

      <Tabs defaultValue="replies">
        <TabsList aria-label="Mail">
          <TabsTab value="inbox">
            <TabsIcon>
              <Mail />
            </TabsIcon>
            Inbox
          </TabsTab>
          <TabsTab value="replies">
            <TabsIcon mirror>
              <Reply />
            </TabsIcon>
            Replies
          </TabsTab>
          <TabsTab value="archive">
            <TabsIcon>
              <Archive />
            </TabsIcon>
            Archive
          </TabsTab>
          <TabsTab value="spam" disabled>
            Spam
          </TabsTab>
        </TabsList>
        <TabsPanel value="inbox">3 new messages.</TabsPanel>
        <TabsPanel value="replies">Someone replied about the launch.</TabsPanel>
        <TabsPanel value="archive">Archived messages stay searchable.</TabsPanel>
        <TabsPanel value="spam">Nothing here.</TabsPanel>
      </Tabs>

      <Tabs defaultValue="Section 9">
        <TabsList aria-label="Sections">
          {sections.map((s) => (
            <TabsTab key={s} value={s}>
              {s}
            </TabsTab>
          ))}
        </TabsList>
        {sections.map((s) => (
          <TabsPanel key={s} value={s}>
            Content for {s}.
          </TabsPanel>
        ))}
      </Tabs>

      <Tabs defaultValue="general" orientation="vertical">
        <Tabs.List aria-label="Preferences">
          <Tabs.Tab value="general">General</Tabs.Tab>
          <Tabs.Tab value="security">Security</Tabs.Tab>
          <Tabs.Tab value="integrations">Integrations</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="general">Language and time zone.</Tabs.Panel>
        <Tabs.Panel value="security">Passkeys and sessions.</Tabs.Panel>
        <Tabs.Panel value="integrations">Calendar and chat apps.</Tabs.Panel>
      </Tabs>
    </section>
  )
}
