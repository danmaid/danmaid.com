import { ContentsServer } from './server'

const key = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDk36EkpDiBDd6o
xZRWzZkaeGh58tsXHX9oCoHxXpD3agaxyhxbquIq8AZqRUHl0bbHxHVLlVVEUtmA
bHlJ+h2XIXknDS0D8txEiiLlNbb3CcwrTvTb4BAJC3FvwlRSrvsveJffSLO6bmhd
Ef7zOCpa33hJGxag0BPgpCxU7PTmVGltqvHH4l4QUQK+AGAmCBEgIoGGQobRk09C
yxOSq+JAgk/A8v9THOf/x9c/zSNxqDdESwTJzwxZAu19lKiSvu0uL79QwoXb2ulN
AoyZmPXh3Kn2LP/VivnEzoBg6p+tVNVnLtMzX9HPcjMyJz4ygq4azmd1zTuNzu5O
GXbhCiYHAgMBAAECggEAeGdBEdKmuxW91hGjGQsuCSPg6o6dPYrSFLy6YW07XD1V
6kAGLR83vhjpdwyaPznVK0Cp6CpWYgwnygzGvekrme8NGkMvNE2WHSSCeQyKBWoN
E5eE7wrvxKJVedLEo37UO8P4OYm4q1Ib6yJlejRI6+d2ExeCDvWID3yuqbrCl0xA
MOiS2az1KO/z0B66f+mHPftUroiUIlKBOe+Cb14RqnihKl4NOs8yQsOQR8cUee0o
WNDzuUXIDKbh0Awyvapxg7dv646bArKKSzSTkMWdeH92zCd0rALEIeg9/QqVuUg4
NzvQ6cYDfC0cT/5A3fncC5lv1V1gVAIItewQS6Py6QKBgQD3T/ET1WH0sFJxCbPV
yVDiZvfnKx1djXCgO15rscCWMSPLWBz2DcCTuRze0JHzl/yoWZ90ZLpMbMrd3AL3
w0GZmGz/KMXkKFUHYeDzO5LOG27TCbEzjfUoEkLPE0t3Cgz2NMTsPL2ME5Os3dUl
k2Vqjrh5f0fp7xa6GHimUSTi9QKBgQDs6d6yrbVLn3E3ess9e+ELfJv9Jl1X0NL9
8PFZeA5fqoR0mehqqzlv/qi//iJ7M5mWT/pZaMZrH46/Ti7+9lCUprSbtKtBFPAj
QzIQAzoUCbl4iXVtq9Kdrbs46mqPYcDgluoAWI7450uH8oLfpV5PDYxu444euXwe
+T9wQGJfiwKBgBJ7tQbIcdO5wc+U7A3UR+lDzM9IF5/ATGSNS1c9J6mR7pzp7vAs
wvHHafL1H5NXDpj+ab5nMM05bEf8g3RE8YgrLio7v953bTNqC0ficexZfITlOosh
1uqxwrB7Pq6c368e7oDBYWEwrV7EDYQLag72r67U5mkDZ21tGsdDVUBpAoGBAL78
SesA3gX4oux2sSD/nIwGCDork1QXo//THL1jazLz45Ob/yD+p28BfEhKNsHa9xWV
o9wv+sSgzBKslHY1WwB6414iZ2wv1OaYZONDtq4wqLPjHCctPLygMS3Qy9aKl1J2
Vm2w9pDw5JLTjW19gml4Ip3CE+/w136gr+NuA9/BAoGAD9k1lEH+Am9dxv93LS1x
6Zo1euFtiWro0kb+amOM960NaYks1NvrFt7TyBdEMdky4YXWBcJ5mYnMytV9Aqpg
SHeCQ7F8/Qkhjh/r4e0I/PPe3hjuAQyMbV164nHyM5T5e1f8VwLMW4ZFpoaVdCEi
+7ZAQ0gl6om3R//TwFOHUbY=
-----END PRIVATE KEY-----`

const cert = `-----BEGIN CERTIFICATE-----
MIIC8DCCAdigAwIBAgIUXu7l3qqOta1an2hK2/LBeZi3GFMwDQYJKoZIhvcNAQEL
BQAwFDESMBAGA1UEAwwJbG9jYWxob3N0MB4XDTIzMTIyOTA2MTQxOVoXDTI4MTIy
NzA2MTQxOVowFDESMBAGA1UEAwwJbG9jYWxob3N0MIIBIjANBgkqhkiG9w0BAQEF
AAOCAQ8AMIIBCgKCAQEA5N+hJKQ4gQ3eqMWUVs2ZGnhoefLbFx1/aAqB8V6Q92oG
scocW6riKvAGakVB5dG2x8R1S5VVRFLZgGx5SfodlyF5Jw0tA/LcRIoi5TW29wnM
K0702+AQCQtxb8JUUq77L3iX30izum5oXRH+8zgqWt94SRsWoNAT4KQsVOz05lRp
barxx+JeEFECvgBgJggRICKBhkKG0ZNPQssTkqviQIJPwPL/Uxzn/8fXP80jcag3
REsEyc8MWQLtfZSokr7tLi+/UMKF29rpTQKMmZj14dyp9iz/1Yr5xM6AYOqfrVTV
Zy7TM1/Rz3IzMic+MoKuGs5ndc07jc7uThl24QomBwIDAQABozowODAUBgNVHREE
DTALgglsb2NhbGhvc3QwCwYDVR0PBAQDAgeAMBMGA1UdJQQMMAoGCCsGAQUFBwMB
MA0GCSqGSIb3DQEBCwUAA4IBAQDUa1x2u72R9BTe7fgkyLlHZYu/lGL+fl/G5gmE
ao/DGshWYH9QIm7tnBuzla5dRMY0IuIxB+TxetFApW/g4ZR2HptPj7oPvAxbCmMd
n3K4On7pY7aP0zcF0SB9rplqVaJT+xTdPAh7Ale7y2f5ZkVX4uHhHLnWnlq4BzAv
GqZgSWRr+BytUowBklLz37iqugcEjgH6qgK7Tqav6ffcntjzhDU0T6pZfpO4GEJu
tY/BfCRuFNZs626Slz0a56eZNkwnD0oqGosOcscdNH6ZX9r+Gtgl2Ewx2HKJlkYY
nC09dj5hMDOLfW2lI4pIm/5KGINbboM8WPoAXKd2bCjKvsHH
-----END CERTIFICATE-----`

const server = new ContentsServer({ key, cert })
server.on('error', console.log)
server.on('stream', (stream, headers) => {
  console.log('open', stream.id, headers)
  stream.on('close', () => console.log('close', stream.id, stream.sentHeaders))
})
server.listen()
