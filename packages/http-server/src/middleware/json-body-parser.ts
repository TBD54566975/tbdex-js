import type { NextFunction, Request, Response } from 'express'
import type { HttpError } from 'http-errors'
import express from 'express'

const bodyParser = express.json({ type: '*/*' })

export function jsonBodyParser() {
  return function(req: Request, res: Response, next: NextFunction) {
    bodyParser(req, res, (error: HttpError) => {
      if (error) {
        return res.status(error.statusCode).json({
          errors: [{ detail: error.message }]
        })
      }

      const contentLength = req.headers['content-length']
      if (contentLength === '0') {
        return res.status(400).json({
          errors: [{ detail: 'expected request body to be a json object' }]
        })
      }

      return next()
    })
  }
}