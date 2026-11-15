"use client"
import { useState } from "react"
import { Button, createDrawerDialogController, DrawerDialog, Input } from "rockin/ui"

type Customer = { id: string; name: string }

const customers: Customer[] = [
  { id: "c1", name: "Acme Mobiles" },
  { id: "c2", name: "Globex Repairs" },
]

const paragraphs = Array.from({ length: 30 }, (_, i) => `Line ${i + 1} of the release notes.`)

export default function Page() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("Rock Star")
  const [log, setLog] = useState<string[]>([])
  const [reminder] = useState(() => createDrawerDialogController<Customer, "send">())
  const push = (entry: string) => setLog((items) => [entry, ...items].slice(0, 6))

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-4 p-6">
      <DrawerDialog onOpenChange={(value, details) => push(`basic ${value} (${details.reason})`)}>
        <DrawerDialog.Trigger render={<Button variant="outline" />}>
          Edit profile
        </DrawerDialog.Trigger>
        <DrawerDialog.Content>
          <DrawerDialog.Header>
            <DrawerDialog.Title>Edit profile</DrawerDialog.Title>
            <DrawerDialog.Description>
              Make changes and save when you're done.
            </DrawerDialog.Description>
          </DrawerDialog.Header>
          <DrawerDialog.Body>
            <Input aria-label="Name" value={name} onChange={(event) => setName(event.target.value)} />
          </DrawerDialog.Body>
          <DrawerDialog.Footer>
            <DrawerDialog.Close render={<Button variant="outline" />}>Cancel</DrawerDialog.Close>
            <DrawerDialog.Close render={<Button />} value="save">
              Save
            </DrawerDialog.Close>
          </DrawerDialog.Footer>
        </DrawerDialog.Content>
      </DrawerDialog>

      <Button variant="outline" onClick={() => setOpen(true)}>
        Controlled, no title
      </Button>
      <DrawerDialog open={open} onOpenChange={setOpen}>
        <DrawerDialog.Content title="Sign in" className="gap-0 p-0 sm:max-w-sm">
          <div className="p-6 text-center">Login form goes here</div>
        </DrawerDialog.Content>
      </DrawerDialog>

      <DrawerDialog>
        <DrawerDialog.Trigger render={<Button variant="outline" />}>Bare</DrawerDialog.Trigger>
        <DrawerDialog.Content>
          <div className="px-4">Nothing but content</div>
        </DrawerDialog.Content>
      </DrawerDialog>

      <DrawerDialog desktop="right">
        <DrawerDialog.Trigger render={<Button variant="outline" />}>
          Order details (side on desktop)
        </DrawerDialog.Trigger>
        <DrawerDialog.Content>
          <DrawerDialog.Header className="border-b pb-4">
            <DrawerDialog.Title>Order #1024</DrawerDialog.Title>
          </DrawerDialog.Header>
          <DrawerDialog.Body>
            {paragraphs.map((line) => (
              <p key={line} className="py-1 text-muted-foreground">
                {line}
              </p>
            ))}
          </DrawerDialog.Body>
          <DrawerDialog.Footer className="border-t pt-4">
            <DrawerDialog.Close render={<Button />}>Done</DrawerDialog.Close>
          </DrawerDialog.Footer>
        </DrawerDialog.Content>
      </DrawerDialog>

      <DrawerDialog snapPoints={[0.5, 1]}>
        <DrawerDialog.Trigger render={<Button variant="outline" />}>
          Snap points
        </DrawerDialog.Trigger>
        <DrawerDialog.Content className="data-[side=bottom]:h-[calc(100dvh-6rem)]">
          <DrawerDialog.Header>
            <DrawerDialog.Title>Snap points</DrawerDialog.Title>
            <DrawerDialog.Description>Drag the handle on mobile.</DrawerDialog.Description>
          </DrawerDialog.Header>
          <DrawerDialog.Body>
            {paragraphs.map((line) => (
              <p key={line} className="py-1">
                {line}
              </p>
            ))}
          </DrawerDialog.Body>
        </DrawerDialog.Content>
      </DrawerDialog>

      <ul className="flex flex-col gap-2">
        {customers.map((customer) => (
          <li key={customer.id} className="flex items-center justify-between gap-2">
            {customer.name}
            <DrawerDialog.Trigger
              controller={reminder}
              payload={customer}
              aria-label={`Remind ${customer.name}`}
              render={<Button size="sm" variant="secondary" />}
            >
              Remind
            </DrawerDialog.Trigger>
          </li>
        ))}
      </ul>
      <Button
        variant="outline"
        onClick={async () => {
          const { reason, returnValue } = await reminder.open({ payload: customers[1] })
          push(`from code: ${returnValue ?? reason}`)
        }}
      >
        Remind from code
      </Button>
      <DrawerDialog
        controller={reminder}
        onOpenChange={(value, d) => push(`remind ${value} ${d.returnValue ?? ""}`)}
      >
        <DrawerDialog.Content<Customer>>
          {(state) => (
            <>
              <DrawerDialog.Header>
                <DrawerDialog.Title>Remind {state.payload?.name}</DrawerDialog.Title>
              </DrawerDialog.Header>
              <DrawerDialog.Footer>
                <DrawerDialog.Close render={<Button variant="outline" />}>
                  Cancel
                </DrawerDialog.Close>
                <DrawerDialog.Close render={<Button />} value="send">
                  Send
                </DrawerDialog.Close>
              </DrawerDialog.Footer>
            </>
          )}
        </DrawerDialog.Content>
      </DrawerDialog>

      <output aria-label="Log" className="flex flex-col text-xs text-muted-foreground">
        {log.map((entry, i) => (
          <span key={`${i}-${entry}`}>{entry}</span>
        ))}
      </output>
    </section>
  )
}
