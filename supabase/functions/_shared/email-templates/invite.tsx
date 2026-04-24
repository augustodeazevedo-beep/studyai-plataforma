/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Você foi convidado para o Study.AI</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://studyai.lovable.app/icon-dark.png" width="48" height="48" alt="Study.AI" style={{ borderRadius: '12px', marginBottom: '16px' }} />
        <Heading style={h1}>Você foi convidado!</Heading>
        <Text style={text}>
          Você recebeu um convite para o{' '}
          <Link href={siteUrl} style={link}><strong>Study.AI</strong></Link>.
          Clique no botão abaixo para aceitar e criar sua conta.
        </Text>
        <Button style={button} href={confirmationUrl}>Aceitar Convite</Button>
        <Text style={footer}>Se você não esperava este convite, ignore este email com segurança.</Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#0d1117', fontFamily: "'Space Grotesk', 'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px', backgroundColor: '#151b25', borderRadius: '12px', margin: '40px auto', maxWidth: '480px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#e5e7eb', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#7b8794', lineHeight: '1.6', margin: '0 0 24px' }
const link = { color: '#1ec8e6', textDecoration: 'underline' }
const button = { backgroundColor: '#1ec8e6', color: '#0d1117', fontSize: '14px', fontWeight: 'bold' as const, borderRadius: '12px', padding: '12px 24px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#555d68', margin: '30px 0 0' }
