
// Constructor function

function StereoCamera(
    Convergence,
    EyeSeparation,
    AspectRatio,
    FOV,
    NearClippingDistance,
    FarClippingDistance
    )
   {
    this.mConvergence = Convergence;
    this.mEyeSeparation = EyeSeparation;
    this.mAspectRatio = AspectRatio;
    this.mFOV = FOV;
    this.mNearClippingDistance = NearClippingDistance;
    this.mFarClippingDistance = FarClippingDistance;
    this.mProjectionMatrix = null;
    this.mModelViewMatrix = null;
  
    this.ApplyLeftFrustum = function() {
      let top, bottom, left, right;
      let a, b, c;

      top = this.mNearClippingDistance * Math.tan(this.mFOV / 2);
      bottom = -top;
  
      a = this.mAspectRatio * Math.tan(this.mFOV / 2) * this.mConvergence;
      b = a - this.mEyeSeparation / 2;
      c = a + this.mEyeSeparation / 2;
  
      left = -b * this.mNearClippingDistance / this.mConvergence;
      right = c * this.mNearClippingDistance / this.mConvergence;
  
      // Set the Projection Matrix
      this.mProjectionMatrix = m4.frustum(left, right, bottom, top, this.mNearClippingDistance,this.mFarClippingDistance);
  
      // Displace the world to right
      this.mModelViewMatrix = m4.translation( this.mEyeSeparation / 2, 0.0, 0.0);
    };
  
    this.ApplyRightFrustum = function() {
      let top, bottom, left, right;
      let a, b, c;

      top = this.mNearClippingDistance * Math.tan(this.mFOV / 2);
      bottom = -top;
  
      a = this.mAspectRatio * Math.tan(this.mFOV / 2) * this.mConvergence;
      b = a - this.mEyeSeparation / 2;
      c = a + this.mEyeSeparation / 2;
  
      left = -c * this.mNearClippingDistance / this.mConvergence;
      right = b * this.mNearClippingDistance / this.mConvergence;
  
      // Set the Projection Matrix
      this.mProjectionMatrix = m4.frustum(left, right, bottom, top, this.mNearClippingDistance, this.mFarClippingDistance);
  
      // Displace the world to left
      this.mModelViewMatrix = m4.translation( -this.mEyeSeparation / 2, 0.0, 0.0);
    };
  
    this.readParams = function() {
      let spans = document.getElementsByClassName("value");

      let eyeSeparation = 0.8;
      eyeSeparation = document.getElementById("eyes_separation").value;
      spans[0].innerHTML = eyeSeparation;
      this.mEyeSeparation = eyeSeparation;

      let field_of_view = 0.7;
      field_of_view = document.getElementById("field_of_view").value;
      spans[1].innerHTML = field_of_view;
      this.mFOV = field_of_view;

      let near_clipping_distance = 4.0;
      near_clipping_distance = -document.getElementById("near_clipping_distance").value;
      spans[2].innerHTML = near_clipping_distance;
      this.mNearClippingDistance = near_clipping_distance
      
      let convergence_distance = 90.0;
      convergence_distance = document.getElementById("convergence_distance").value;
      spans[3].innerHTML = convergence_distance;
      this.mConvergence = convergence_distance
    }
  }
  