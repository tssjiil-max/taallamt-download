import React from 'react';
import type {CompanionState} from './state';

// Shakabumbo's body, rebuilt as a jointed vector rig so the character can genuinely walk,
// fall, sit and gesture instead of a single static illustration being slid or rocked.
// Every limb is two nested groups (thigh/shin, upper-arm/forearm) that rotate around real
// pivot points. The silhouette and detailing below are redrawn to match the approved
// reference art in design/shakabumbo/originals/04-standing-white-hair-star.png: a round
// light-green face, large close-set eyes, a wind-swept white-to-turquoise hairstyle, long
// pointed ears with a teal inner swirl, a white robot suit with black joint rings, a visible
// chest light, a belt buckle, and wide rounded boots each with a green ankle band — not a
// generic simplified robot. The joints are driven entirely by CSS (see app.src.css), keyed
// off data-state/data-talking, so a reduced-motion viewer still sees the correct silhouette
// for each state, just without the animated transition.

export function ShakabumboRig({state,talking}:{state:CompanionState;talking:boolean}){
  return (
    <svg className="shakRig" data-state={state} data-talking={talking?'1':'0'} viewBox="0 0 220 300" width="100%" height="100%" role="img" aria-hidden="true">
      <g className="shakShadow"><ellipse cx="110" cy="286" rx="40" ry="8"/></g>
      <g className="shakBounce">
        {/* back arm (the one further from the viewer walks with an opposite phase) */}
        <g className="shakArm shakArmBack" style={{transformOrigin:'146px 116px'}}>
          <circle className="shakJointRing" cx="146" cy="116" r="11"/>
          <circle className="shakJointLight" cx="146" cy="116" r="5"/>
          <g className="shakUpperArm">
            <rect className="shakLimbPart" x="136" y="112" width="20" height="44" rx="10"/>
            <g className="shakForearm" style={{transformOrigin:'146px 154px'}}>
              <circle className="shakJointRing" cx="146" cy="154" r="9.5"/>
              <circle className="shakJointLight" cx="146" cy="154" r="4"/>
              <rect className="shakLimbPart" x="137" y="150" width="18" height="38" rx="9"/>
              <circle className="shakHand" cx="146" cy="194" r="13"/>
            </g>
          </g>
        </g>

        {/* back leg */}
        <g className="shakLeg shakLegBack" style={{transformOrigin:'128px 176px'}}>
          <circle className="shakJointRing" cx="128" cy="176" r="12"/>
          <circle className="shakJointLight" cx="128" cy="176" r="5"/>
          <rect className="shakThigh" x="117" y="170" width="22" height="52" rx="10"/>
          <g className="shakShin" style={{transformOrigin:'128px 220px'}}>
            <circle className="shakJointRing" cx="128" cy="220" r="9.5"/>
            <circle className="shakKneeLight" cx="128" cy="220" r="4"/>
            <rect className="shakLimbPart" x="118" y="216" width="20" height="44" rx="9"/>
            <g className="shakFoot">
              <rect className="shakBoot" x="108" y="252" width="40" height="22" rx="11"/>
              <rect x="108" y="266" width="40" height="8" rx="4" className="shakSole"/>
              <rect x="112" y="252" width="32" height="6" rx="3" className="shakBootBand"/>
            </g>
          </g>
        </g>

        {/* torso + head group, leans slightly as the character turns and walks */}
        <g className="shakTorsoGroup">
          <g className="shakTorso">
            <rect className="shakTorsoBody" x="74" y="100" width="72" height="82" rx="26"/>
            <circle className="shakShoulderPadL" cx="80" cy="110" r="10"/>
            <circle className="shakShoulderPadR" cx="140" cy="110" r="10"/>
            <rect x="90" y="150" width="40" height="7" rx="3.5" className="shakBelt"/>
            <rect x="103" y="148" width="14" height="11" rx="2.5" className="shakBuckle"/>
            <circle className="shakChestRing" cx="110" cy="130" r="13"/>
            <circle className="shakChestLight" cx="110" cy="130" r="10"/>
            <circle className="shakChestLightCore" cx="110" cy="130" r="4.6"/>
          </g>

          <g className="shakHead">
            <path className="shakHair" d="M60 58
              C52 26 74 2 98 8
              C104 -4 124 -4 130 8
              C148 0 170 16 162 36
              C180 30 184 58 168 66
              C176 80 158 90 146 80
              C138 92 84 92 74 80
              C62 88 50 76 58 64
              C50 66 48 54 60 58Z"/>
            <path className="shakHairStrand" d="M86 10 C88 2 98 -2 104 4"/>
            <path className="shakHairStrand" d="M128 6 C136 0 148 2 150 12"/>
            <ellipse className="shakFace" cx="110" cy="76" rx="48" ry="50"/>
            <path className="shakEarL" d="M60 70 C40 64 34 96 54 102 C62 104 70 94 65 82 Z"/>
            <path className="shakEarSwirlL" d="M53 80 C48 84 50 92 57 93"/>
            <path className="shakEarR" d="M160 70 C180 64 186 96 166 102 C158 104 150 94 155 82 Z"/>
            <path className="shakEarSwirlR" d="M167 80 C172 84 170 92 163 93"/>
            <g className="shakEyes">
              <circle className="shakEyeWhite" cx="90" cy="74" r="15"/>
              <circle className="shakEyeWhite" cx="130" cy="74" r="15"/>
              <circle className="shakPupil" cx="92" cy="75" r="7"/>
              <circle className="shakPupil" cx="132" cy="75" r="7"/>
              <circle className="shakGlint" cx="96" cy="70" r="2.4"/>
              <circle className="shakGlint" cx="136" cy="70" r="2.4"/>
            </g>
            <path className="shakBrowL" d="M78 55 Q90 48 101 55"/>
            <path className="shakBrowR" d="M119 55 Q130 48 142 55"/>
            <path className="shakMouthClosed" d="M96 100 Q110 107 124 100"/>
            <path className="shakMouthOpen" d="M96 98 Q110 120 124 98 Q110 110 96 98 Z"/>
          </g>
        </g>

        {/* front leg */}
        <g className="shakLeg shakLegFront" style={{transformOrigin:'94px 176px'}}>
          <circle className="shakJointRing" cx="94" cy="176" r="12"/>
          <circle className="shakJointLight" cx="94" cy="176" r="5"/>
          <rect className="shakThigh" x="83" y="170" width="22" height="52" rx="10"/>
          <g className="shakShin" style={{transformOrigin:'94px 220px'}}>
            <circle className="shakJointRing" cx="94" cy="220" r="9.5"/>
            <circle className="shakKneeLight" cx="94" cy="220" r="4"/>
            <rect className="shakLimbPart" x="84" y="216" width="20" height="44" rx="9"/>
            <g className="shakFoot">
              <rect className="shakBoot" x="72" y="252" width="40" height="22" rx="11"/>
              <rect x="72" y="266" width="40" height="8" rx="4" className="shakSole"/>
              <rect x="76" y="252" width="32" height="6" rx="3" className="shakBootBand"/>
            </g>
          </g>
        </g>

        {/* front arm (nearer the viewer; points at the question, waves, claps, holds the star) */}
        <g className="shakArm shakArmFront" style={{transformOrigin:'74px 116px'}}>
          <circle className="shakJointRing" cx="74" cy="116" r="11"/>
          <circle className="shakJointLight" cx="74" cy="116" r="5"/>
          <g className="shakUpperArm">
            <rect className="shakLimbPart" x="64" y="112" width="20" height="44" rx="10"/>
            <g className="shakForearm" style={{transformOrigin:'74px 154px'}}>
              <circle className="shakJointRing" cx="74" cy="154" r="9.5"/>
              <circle className="shakJointLight" cx="74" cy="154" r="4"/>
              <rect className="shakLimbPart" x="65" y="150" width="18" height="38" rx="9"/>
              <circle className="shakHand" cx="74" cy="194" r="13"/>
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
