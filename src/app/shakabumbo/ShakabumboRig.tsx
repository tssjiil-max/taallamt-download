import React from 'react';
import type {CompanionState} from './state';

// Shakabumbo's body, rebuilt as a jointed vector rig so the character can genuinely walk,
// fall, sit and gesture instead of a single static illustration being slid or rocked.
// Every limb is two nested groups (thigh/shin, upper-arm/forearm) that rotate around real
// pivot points, matching the approved character: light-green face, large eyes, white hair
// brushed toward turquoise, long pointed ears, and a white robot suit with black joint
// lines and green status lights. The joints are driven entirely by CSS (see
// companion-rig.css), keyed off data-state/data-talking, so a reduced-motion viewer still
// sees the correct silhouette for each state, just without the animated transition.

export function ShakabumboRig({state,talking}:{state:CompanionState;talking:boolean}){
  return (
    <svg className="shakRig" data-state={state} data-talking={talking?'1':'0'} viewBox="0 0 220 300" width="100%" height="100%" role="img" aria-hidden="true">
      <g className="shakShadow"><ellipse cx="110" cy="286" rx="38" ry="8"/></g>
      <g className="shakBounce">
        {/* back arm (the one further from the viewer walks with an opposite phase) */}
        <g className="shakArm shakArmBack" style={{transformOrigin:'146px 118px'}}>
          <g className="shakUpperArm">
            <rect x="136" y="112" width="20" height="46" rx="10"/>
            <g className="shakForearm" style={{transformOrigin:'146px 156px'}}>
              <rect x="137" y="150" width="18" height="40" rx="9"/>
              <circle className="shakCuffLight" cx="146" cy="178" r="4"/>
              <circle className="shakHand" cx="146" cy="196" r="12"/>
            </g>
          </g>
        </g>

        {/* back leg */}
        <g className="shakLeg shakLegBack" style={{transformOrigin:'128px 176px'}}>
          <rect className="shakThigh" x="117" y="170" width="22" height="54" rx="10"/>
          <g className="shakShin" style={{transformOrigin:'128px 222px'}}>
            <rect x="118" y="218" width="20" height="46" rx="9"/>
            <circle className="shakKneeLight" cx="128" cy="222" r="3.6"/>
            <g className="shakFoot">
              <rect x="112" y="256" width="34" height="18" rx="8"/>
              <rect x="112" y="268" width="34" height="7" rx="3.5" className="shakSole"/>
            </g>
          </g>
        </g>

        {/* torso + head group, leans slightly as the character turns and walks */}
        <g className="shakTorsoGroup">
          <g className="shakTorso">
            <rect x="76" y="104" width="68" height="78" rx="24"/>
            <rect x="92" y="150" width="36" height="6" rx="3" className="shakBelt"/>
            <circle className="shakChestLight" cx="110" cy="134" r="11"/>
            <circle className="shakChestLightCore" cx="110" cy="134" r="5"/>
          </g>

          <g className="shakHead">
            <path className="shakHair" d="M64 56
              C60 30 78 10 96 14
              C100 2 118 0 124 12
              C140 4 158 18 152 36
              C166 30 170 52 158 60
              C164 72 150 80 140 72
              C132 82 90 82 82 72
              C70 80 56 70 64 56Z"/>
            <ellipse className="shakFace" cx="110" cy="74" rx="46" ry="48"/>
            <path className="shakEarL" d="M62 68 C44 64 40 92 58 96 C64 98 70 90 66 80 Z"/>
            <path className="shakEarR" d="M158 68 C176 64 180 92 162 96 C156 98 150 90 154 80 Z"/>
            <g className="shakEyes">
              <circle className="shakEyeWhite" cx="92" cy="72" r="14"/>
              <circle className="shakEyeWhite" cx="128" cy="72" r="14"/>
              <circle className="shakPupil" cx="94" cy="73" r="6.4"/>
              <circle className="shakPupil" cx="130" cy="73" r="6.4"/>
              <circle className="shakGlint" cx="97" cy="69" r="2"/>
              <circle className="shakGlint" cx="133" cy="69" r="2"/>
            </g>
            <path className="shakBrowL" d="M80 54 Q92 48 102 54"/>
            <path className="shakBrowR" d="M118 54 Q128 48 140 54"/>
            <path className="shakMouthClosed" d="M98 98 Q110 104 122 98"/>
            <path className="shakMouthOpen" d="M98 96 Q110 116 122 96 Q110 108 98 96 Z"/>
          </g>
        </g>

        {/* front leg */}
        <g className="shakLeg shakLegFront" style={{transformOrigin:'94px 176px'}}>
          <rect className="shakThigh" x="83" y="170" width="22" height="54" rx="10"/>
          <g className="shakShin" style={{transformOrigin:'94px 222px'}}>
            <rect x="84" y="218" width="20" height="46" rx="9"/>
            <circle className="shakKneeLight" cx="94" cy="222" r="3.6"/>
            <g className="shakFoot">
              <rect x="76" y="256" width="34" height="18" rx="8"/>
              <rect x="76" y="268" width="34" height="7" rx="3.5" className="shakSole"/>
            </g>
          </g>
        </g>

        {/* front arm (nearer the viewer; points at the question, waves, claps) */}
        <g className="shakArm shakArmFront" style={{transformOrigin:'74px 118px'}}>
          <g className="shakUpperArm">
            <rect x="64" y="112" width="20" height="46" rx="10"/>
            <g className="shakForearm" style={{transformOrigin:'74px 156px'}}>
              <rect x="65" y="150" width="18" height="40" rx="9"/>
              <circle className="shakCuffLight" cx="74" cy="178" r="4"/>
              <circle className="shakHand" cx="74" cy="196" r="12"/>
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
