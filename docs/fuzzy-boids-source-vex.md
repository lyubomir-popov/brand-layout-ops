// initial state
//uv@P = fit01(rand(@ptnum), {-3,-3,-3}, {3,3,3});
//vector centroid = detail(0, 'centroid', 0);
//vector direction_to_center = normalize(centroid - @P);
v@v = {0, -10, 0} * ch('speed');     // meters per second
//v@v += fit01(rand(@P), {-12,-12,-12}, {12,12,12}) * chf("sim_scale");

v@accel = {0,0,0}; // meters per second
f@mass = 1.0;      // not worrying about units here
i@id = @ptnum;
v@N = normalize(@v);
v@up = {0,1,0};

i@start_frame = (int)(fit01(rand(@ptnum), 0, 8) + 0.5);

// flatten to x,y plane
@P.z = 0;
@v.z = 0;


// inside solver
// separation by n
int   max_neighbors = chi("max_neighbours");
float max_strength  = ch("max_strength");
float min_dist      = ch("min_dist");
float max_dist      = ch("max_dist");
float max_radius    = 999999;

float  dist_to_neighbour, norm_dist_to_neighbour, strength;
vector neighbour_pos, vec_to_neighbour, norm_vec_to_neighbour;

vector accum = {0,0,0};
vector pos = point(0, "P", @elemnum);
int ptlist[] = pcfind(0, "P", pos, max_radius, max_neighbors + 1);

foreach (int neighbour_ptnum; ptlist) {
    if (neighbour_ptnum == @elemnum)
        continue; // if self, skip

    neighbour_pos = point(0, "P", neighbour_ptnum);
    vec_to_neighbour = neighbour_pos - pos;
    norm_vec_to_neighbour = normalize(vec_to_neighbour);
    dist_to_neighbour = length(vec_to_neighbour); // can we use len2?
    norm_dist_to_neighbour = (clamp(dist_to_neighbour, min_dist, max_dist) - min_dist) / (max_dist - min_dist); // 0-1 range
    strength = chramp("falloff_ramp", norm_dist_to_neighbour) * max_strength;
    //strength = 1/exp(norm_dist_to_neighbour);
    accum += (-norm_vec_to_neighbour) * strength;
}

vector accel = point(0, "accel", @elemnum);
accel += accum;
int tmp1 = setpointattrib(0, "accel", @elemnum, accel);


// fuzzy alignment wrangle
#define HALF_PI      1.570796326794896619231321691
int left_or_right(vector a; vector b) {
    vector cp = normalize(cross(a, b));
    if (cp.z < 0)
        return  1;
    else
        return -1;
}

int   max_neighbors   = chi("max_neighbours");
float near_threshold  = ch("near_threshold");
float far_threshold   = ch("far_threshold");
float speed_threshold = ch("speed_threshold");
float max_radius      = 999999;

// storage for pc loop calculations
float heading_correction_weight  = 0; // heading correction weight
float speed_correction_weight  = 0; // speed correction weight
float significance_weight = 0; // significance weight

vector v = point(0, "v", @elemnum);
vector norm_v = normalize(v);

vector vec_to_neighbour;
vector neighbour_pos;
vector neighbour_v;
vector norm_neighbour_v;
vector v_difference;
float  dist_to_neighbour;
float  speed_diff;

vector fuzzy_speed   = {0,0,0};
vector fuzzy_heading = {0,0,0};
vector correction_rt = normalize(cross(norm_v, {0,0,1}));

vector pos = point(0, "P", @elemnum);
int ptlist[] = pcfind(0, "P", pos, max_radius, max_neighbors + 1);

foreach (int neighbour_ptnum; ptlist) {
    if (neighbour_ptnum == @elemnum)
        continue; // if self, skip

    neighbour_pos = point(0, "P", neighbour_ptnum);
    neighbour_v = point(0, "v", neighbour_ptnum);

    // significance
    //
    vec_to_neighbour = neighbour_pos - pos;
    dist_to_neighbour = length(vec_to_neighbour); // can we use len2?

    significance_weight = 1.0 - fit(dist_to_neighbour, near_threshold, far_threshold, 0.0, 1.0);

    norm_neighbour_v = normalize(neighbour_v);
    heading_correction_weight = 1.0 - dot(norm_v, norm_neighbour_v);

    if (left_or_right(norm_v, norm_neighbour_v) == 1)
        fuzzy_heading +=  correction_rt * heading_correction_weight * significance_weight;
    else
        fuzzy_heading += -correction_rt * heading_correction_weight * significance_weight;

    // speed correction
    // this emulates the three Sd functions
    //
    v_difference = neighbour_v - v;
    speed_diff = length(v_difference);
    speed_correction_weight = fit(speed_diff, 0, speed_threshold, 0, 1.0);

    fuzzy_speed += v_difference * speed_correction_weight * significance_weight;
}

vector accel = point(0, "accel", @elemnum);
accel += fuzzy_heading;
accel += fuzzy_speed;
int tmp1 = setpointattrib(0, "accel", @elemnum, accel);


// boundary repel - if sdf provided
vector dP = @v * @TimeInc;
float sdfBefore = volumesample(1, 'sdf', @P);
float sdfAfter = volumesample(1, 'sdf', @P + dP);
vector v_normalized = normalize(v@v);
vector toBoundary = dP *(abs(sdfBefore) / (abs(sdfBefore) + abs(sdfAfter)));
vector intersection = @P + toBoundary;
vector grad = volumesamplev(1, 'sdf_grad', intersection); // normal(direction of steepest increase of grad)
vector grad_p = volumesamplev(1, 'sdf_grad', @P); // normal(direction of steepest increase of grad)
vector axis = normalize(cross(v_normalized, grad));
vector repel_force = 0;

float angle = 2 * acos(dot(normalize(-grad), normalize(-toBoundary)));
vector4 q = quaternion(angle, axis);
repel_force = qrotate(q, -v_normalized);

float repel = chf('repel_coeff');
float boundaryApproachRate = 1.0 / (0.000000001 + pow(abs(sdfBefore), chf('power')));//(sdfAfter - sdfBefore) / length(@v);
float c = -boundaryApproachRate * repel * 0.000001;

f@c = c;
v@accel += c * normalize(grad_p);
v@accc = v@accel;
f@sdfBefore = sdfBefore;
f@sdfAfter = sdfAfter;
v@toBoundary = toBoundary;


// cohesion wrangle
float min_dist  = chf("min_dist");
float max_dist  = chf("max_dist");
float max_accel = chf("max_accel");

vector pos = point(0, "P", @elemnum);

vector centroid;
if(chi("attract_to_origin") == 0) {
    centroid = detail(0, "flock_center");
} else {
    centroid = chv("origin_to_attract_to");
}

vector vec_to_centroid = centroid - pos;
vector norm_vec_to_centroid = normalize(vec_to_centroid);

float dist_range = max_dist - min_dist;
float dist_to_centroid = length(vec_to_centroid);
dist_to_centroid = clamp(dist_to_centroid, min_dist, max_dist);
float accel_strength = (dist_to_centroid / dist_range) * max_accel;

vector accel = point(0, "accel", @elemnum);
accel += norm_vec_to_centroid * accel_strength;
int tmp1 = setpointattrib(0, "accel", @elemnum, accel);

// integrate wrangle 
float min_speed = ch("min_speed_limit"); // meters per second
float max_speed = ch("max_speed_limit"); // meters per second
float min_accel = ch("min_accel_limit"); // meters per second
float max_accel = ch("max_accel_limit"); // meters per second

// clamp acceleration
vector accel_speed = length(@v);
v@accel = normalize(v@accel) * clamp(length(v@accel), min_accel, max_accel);

// semi implicit euler
// update velocity first
@v += v@accel * f@mass * @TimeInc;

// apply speed clamp
vector speed = length(@v);
@v = normalize(@v) * clamp(speed, min_speed, max_speed);


// integrate 2
@P.z = 0;
@v.z = 0;
// use updated velocity to solve new position
@P += @v * @TimeInc;

// clear acceleration for next time step
v@accel = {0,0,0};
