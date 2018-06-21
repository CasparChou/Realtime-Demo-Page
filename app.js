const express = require('express')
const app = express()

app.use('/', express.static('public'))

app.listen(8089, () => console.log('Example app listening on port 8089!'))
