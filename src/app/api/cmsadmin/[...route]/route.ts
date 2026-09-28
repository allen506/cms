import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy all /api/cmsadmin/* requests to /api/admin/*
 * This allows consolidating admin API access under cmsadmin namespace
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ route: string[] }> }
) {
  const { route } = await params;
  const routePath = route?.join('/') || '';
  
  // Proxy to /api/admin endpoint
  const url = `http://localhost:3000/api/admin/${routePath}${request.nextUrl.search}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: Object.fromEntries(request.headers.entries()),
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to proxy request' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ route: string[] }> }
) {
  const { route } = await params;
  const routePath = route?.join('/') || '';
  
  const url = new URL(request.url);
  url.pathname = `/api/admin/${routePath}`;
  url.search = request.nextUrl.search;
  
  try {
    const body = await request.text();
    const response = await fetch(url, {
      method: 'POST',
      headers: request.headers,
      body: body || undefined,
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to proxy request' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ route: string[] }> }
) {
  const { route } = await params;
  const routePath = route?.join('/') || '';
  
  const url = new URL(request.url);
  url.pathname = `/api/admin/${routePath}`;
  url.search = request.nextUrl.search;
  
  try {
    const body = await request.text();
    const response = await fetch(url, {
      method: 'PATCH',
      headers: request.headers,
      body: body || undefined,
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to proxy request' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ route: string[] }> }
) {
  const { route } = await params;
  const routePath = route?.join('/') || '';
  
  const url = new URL(request.url);
  url.pathname = `/api/admin/${routePath}`;
  url.search = request.nextUrl.search;
  
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: request.headers,
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to proxy request' },
      { status: 500 }
    );
  }
}
