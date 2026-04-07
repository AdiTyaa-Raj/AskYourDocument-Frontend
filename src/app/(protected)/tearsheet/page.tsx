import { redirect } from 'next/navigation'

export default function TearsheetIndexPage() {
  // Redirect to company ID 1 as default
  redirect('/tearsheet/1')
}
