'use client'

import { Center } from '@/types'

interface LocationModalProps {
  center: Center
}

export default function LocationModal({ center }: LocationModalProps) {
  if (!center.map_embed_url) return null

  return (
    <div 
      className="modal fade" 
      id={`locationModal-${center.id}`} 
      tabIndex={-1} 
      aria-labelledby={`locationModalLabel-${center.id}`} 
      aria-hidden="true"
    >
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id={`locationModalLabel-${center.id}`}>
              {center.name} - Location
            </h5>
            <button 
              type="button" 
              className="btn-close" 
              data-bs-dismiss="modal" 
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body">
            <div className="location-map-container">
              <iframe 
                src={center.map_embed_url} 
                width="100%" 
                height="450" 
                style={{ border: 0 }} 
                allowFullScreen 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
            {center.address && (
              <div className="location-address mt-3">
                <p className="mb-1">
                  <strong><i className="ri-map-pin-line"></i> Address:</strong>
                </p>
                <p className="text-muted">{center.address}</p>
              </div>
            )}
            {center.phone && center.phone.length > 0 && (
              <div className="location-contact">
                <p className="mb-1">
                  <strong><i className="ri-phone-line"></i> Contact:</strong>
                </p>
                <p className="text-muted">
                  {center.phone.map((phone, index) => (
                    <span key={index}>
                      <a href={`tel:${phone}`}>{phone}</a>
                      {index < center.phone!.length - 1 && ', '}
                    </span>
                  ))}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
