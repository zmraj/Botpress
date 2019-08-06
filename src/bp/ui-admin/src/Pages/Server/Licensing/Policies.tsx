import { CheckPolicyResult } from 'common/licensing-service'
import React, { FC } from 'react'

const Policies: FC<{ data: CheckPolicyResult[] }> = props => {
  return (
    <table className="table bp-licensing">
      <tbody>
        {props.data &&
          props.data.map((entry, idx) => {
            return (
              <tr key={idx} title={entry.policy}>
                <td>
                  {entry.breached ? (
                    <span role="img" aria-label="Breached">
                      ❌
                    </span>
                  ) : (
                    <span className="bp-licensing__check">✓</span>
                  )}
                </td>
                <td>{entry.policy}</td>
                <td>{entry.status}</td>
              </tr>
            )
          })}
      </tbody>
    </table>
  )
}

export default Policies
